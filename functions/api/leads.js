const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  }
});

const clean = (value, max = 2000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  const host = new URL(request.url).origin;
  if (origin && origin !== host) {
    return json({ error: "Request origin was not accepted." }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Please submit valid form details." }, 400);
  }

  const lead = {
    name: clean(body.name, 120),
    phone: clean(body.phone, 40),
    email: clean(body.email, 200),
    projectType: clean(body.projectType, 120),
    location: clean(body.location, 160),
    area: clean(body.area, 100),
    message: clean(body.message, 3000),
    source: clean(body.source, 40) || "website"
  };

  if (!lead.name || !lead.phone || !lead.projectType) {
    return json({ error: "Please complete your name, phone number and project type." }, 400);
  }
  if (!/^[+0-9() .-]{8,25}$/.test(lead.phone)) {
    return json({ error: "Please enter a valid phone number." }, 400);
  }
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  const details = [
    ["Name", lead.name],
    ["Phone", lead.phone],
    ["Email", lead.email],
    ["Project type", lead.projectType],
    ["Location", lead.location],
    ["Approx. area", lead.area],
    ["Project details", lead.message],
    ["Source", lead.source],
    ["Received at", new Date().toISOString()]
  ].filter(([, value]) => value);

  const message = details.map(([label, value]) => label + ": " + value).join("\n");
  const jobs = [];

  if (env.RESEND_API_KEY && env.LEAD_EMAIL) {
    jobs.push((async () => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.RESEND_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.LEAD_FROM_EMAIL || "Leaf Infra Website <onboarding@resend.dev>",
          to: [env.LEAD_EMAIL],
          subject: "New Leaf Infra project enquiry — " + lead.projectType,
          text: message,
          reply_to: lead.email || undefined
        })
      });
      if (!response.ok) throw new Error("Email notification failed.");
      return "email";
    })());
  }

  if (env.WA_ACCESS_TOKEN && env.WA_PHONE_NUMBER_ID && env.WHATSAPP_NUMBER) {
    jobs.push((async () => {
      const response = await fetch(
        "https://graph.facebook.com/v23.0/" + encodeURIComponent(env.WA_PHONE_NUMBER_ID) + "/messages",
        {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + env.WA_ACCESS_TOKEN,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: env.WHATSAPP_NUMBER.replace(/\D/g, ""),
            type: "text",
            text: { preview_url: false, body: "New Leaf Infra website enquiry\n\n" + message }
          })
        }
      );
      if (!response.ok) throw new Error("WhatsApp notification failed.");
      return "whatsapp";
    })());
  }

  if (!jobs.length) {
    return json({
      error: "Enquiry delivery is not configured yet. Please contact Leaf Infra directly while setup is completed."
    }, 503);
  }

  const results = await Promise.allSettled(jobs);
  const delivered = results
    .filter(result => result.status === "fulfilled")
    .map(result => result.value);

  if (!delivered.length) {
    return json({
      error: "We couldn't deliver your enquiry just now. Please try again or contact us directly."
    }, 502);
  }

  return json({
    ok: true,
    delivered,
    warning: delivered.length !== jobs.length
      ? "Your enquiry was sent through one configured channel; another notification channel needs attention."
      : undefined
  });
}

export async function onRequestGet() {
  return json({ error: "Use POST to submit an enquiry." }, 405);
}
