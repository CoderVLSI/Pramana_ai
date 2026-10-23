import json,re,unicodedata,difflib,sys
ch=sys.argv[1]
J=json.load(open(f'J_ch{ch}.json'))['entries']; R=json.load(open(f'R_ch{ch}.json'))['entries']
def n(t): return re.sub(r'[\s।॥\d०-९·ऽ\-\.\!\?,;:]+','',unicodedata.normalize('NFC',t))
def concat(E):
    s='';spans=[]
    for e in E:
        t=n(e['text']); spans.append((len(s),len(s)+len(t),e)); s+=t
    return s,spans
rs,rsp=concat(R); js,jsp=concat(J)
sm=difflib.SequenceMatcher(None,rs,js,autojunk=False)
def owner(spans,pos):
    for a,b,e in spans:
        if a<=pos<b: return e
    return spans[-1][2]
items={}
for tag,i1,i2,j1,j2 in sm.get_opcodes():
    if tag=='equal': continue
    re_=owner(rsp,min(i1,len(rs)-1)); je=owner(jsp,min(j1,len(js)-1))
    key=re_['verse']
    it=items.setdefault(key,{'verse':f"R{key}",'bombay_image':re_['page_index'],'calcutta_images':set(),'differences':[]})
    it['calcutta_images'].add(je['page_index'])
    it['differences'].append({'bombay':rs[max(0,i1-5):i2+5],'calcutta':js[max(0,j1-5):j2+5],'calcutta_verse_label':je['verse']})
out=[]
for k in items:
    it=items[k]; it['calcutta_images']=sorted(it['calcutta_images']); out.append(it)
json.dump(out,open(f'arbiter_input_ch{ch}.json','w'),ensure_ascii=False,indent=1)
print('ratio',round(sm.ratio(),3),'items',len(out),'spots',sum(len(o['differences']) for o in out))
