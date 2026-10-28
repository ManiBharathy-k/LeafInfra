from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import xml.etree.ElementTree as ET
class Page(HTMLParser):
 def __init__(self):super().__init__();self.refs=[];self.ids=[];self.h1=0;self.title=False
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if 'id' in d:self.ids.append(d['id'])
  if tag=='h1':self.h1+=1
  if tag=='title':self.title=True
  for a in ('href','src'):
   if d.get(a):self.refs.append(d[a])
root=Path(__file__).resolve().parent.parent
pages={}
for f in root.glob('*.html'):
 p=Page();p.feed(f.read_text());pages[f.name]=p
 assert p.h1==1,(f,'h1 count',p.h1)
 assert p.title,(f,'missing title')
 assert len(p.ids)==len(set(p.ids)),(f,'duplicate ids')
for name,p in pages.items():
 for ref in p.refs:
  url=urlsplit(ref)
  if url.scheme or url.netloc:continue
  target=unquote(url.path).lstrip('/') or (name if ref.startswith('#') else 'index.html')
  if not (root/target).is_file() and (root/(target+'.html')).is_file():target+='.html'
  assert (root/target).is_file(),(name,ref,'missing target')
  if url.fragment and target in pages:assert url.fragment in pages[target].ids,(name,ref,'missing fragment')
ET.parse(root/'sitemap.xml');ET.parse(root/'assets/architecture.svg')
print(f'Checked {len(pages)} pages: titles, single h1, unique ids, local links/assets, fragments, sitemap and SVG')

# Model Cloudflare's automatic .html canonical redirects alongside custom rules.
edges={'/'+name:'/'+name.removesuffix('.html') for name in pages if name!='index.html'}
for line in (root/'_redirects').read_text().splitlines():
 if not line.strip() or line.lstrip().startswith('#'):continue
 source,destination,status=line.split()
 if status in ('301','302','303','307','308'):edges[source]=destination
for start in edges:
 seen=set(); current=start
 while current in edges:
  assert current not in seen,('redirect cycle',start,current)
  seen.add(current);current=edges[current]
print('Cloudflare canonicalization and custom redirect cycle checks passed')
