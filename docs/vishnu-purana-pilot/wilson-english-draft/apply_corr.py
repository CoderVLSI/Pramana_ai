import json,sys,re,collections
d=json.load(open('ocr/book1_draft2.json'))
ops=[]
for f in sys.argv[1:]:
    x=json.load(open(f)); x=x.get('corrections',x) if isinstance(x,dict) else x
    ops+=x
def norm(t):
    t=re.sub(r'(?<=[A-Za-z\u00c0-\u024f\u1e00-\u1eff,;:.\)\u2019])\s+(\d{1,2})(?=[\s,;:.)\u2014-]|$)','',t)
    t=re.sub(r'\s+([,;:.!?])',r'\1',t)
    return re.sub(r'\s+',' ',t).strip()
by=collections.defaultdict(list)
for e in d: by[e['chapter']].append(e)
applied=failed=skipped=0; failures=[]
for o in ops:
    if o.get('missing') or 'split_before' in o or o.get('merge_with_next'):
        skipped+=1; continue
    f,r=o.get('find'),o.get('replace')
    if not f or r is None: skipped+=1; continue
    f=norm(f); r=norm(r)
    if f==r: skipped+=1; continue
    ch=o.get('chapter'); v=str(o.get('verse'))
    cands=[e for e in by.get(ch,[]) if e['verse']==v and f in e['text']]
    if not cands: cands=[e for e in by.get(ch,[]) if f in e['text']]
    if not cands: cands=[e for e in d if f in e['text']]
    if len(cands)==1 or (cands and cands[0]['verse']==v):
        c=cands[0]; c['text']=c['text'].replace(f,r,1); applied+=1
    else:
        failed+=1; failures.append((ch,v,f[:30],len(cands)))
json.dump(d,open('ocr/book1_corrected.json','w'),ensure_ascii=False,indent=0)
print('ops',len(ops),'applied',applied,'failed',failed,'skipped',skipped)
print(collections.Counter(x[3] for x in failures))
