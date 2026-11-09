import json,re,unicodedata,collections
def n(t): return re.sub(r'[\s।॥\d०-९·ऽ\-\.\!\?,;:()\[\]]+','',unicodedata.normalize('NFC',t))
A={e['verse']:e for e in json.load(open('kurma_ch1_A.json'))['entries']}
B={e['verse']:e for e in json.load(open('kurma_ch1_B.json'))['entries']}
dec=collections.defaultdict(dict)
for f in ('arbk_out_1.json','arbk_out_2.json','arbk_out_redo.json'):  # later files supersede
    for r in json.load(open(f)): dec[r['verse']][r['spot_index']]=r
out=[];st=collections.Counter()
keys=sorted(A.keys()|B.keys(),key=lambda k:(0,int(k)) if k.isdigit() else (1,k))
for k in keys:
    a,b=A.get(k),B.get(k)
    if not(a and b) or not k.isdigit():
        e=a or b; out.append({'verse':k,'status':'heading_or_colophon','A':a and a['text'],'B':b and b['text']});continue
    if n(a['text'])==n(b['text']): out.append({'verse':k,'status':'identical','text':b['text'],'page_index':b['page_index']});st['identical']+=1;continue
    ds=list(dec.get(k,{}).values());sides={r['decision'] for r in ds}
    low=any(r.get('confidence')=='low' for r in ds)
    s='settled_A' if ds and sides=={'A'} and not low else 'settled_B' if ds and sides=={'B'} and not low else 'unresolved'
    st[s]+=1
    e={'verse':k,'status':s,'page_index':b['page_index']}
    if s=='settled_A': e['text']=a['text']
    elif s=='settled_B': e['text']=b['text']
    else: e['A']=a['text'];e['B']=b['text'];e['calls']=[(r['spot_index'],r['decision'],r.get('confidence'),r.get('own_reading')) for r in ds]
    out.append(e)
json.dump({'work':'kurma-purana','chapter':1,'edition':'Bibliotheca Indica, Calcutta 1890 (b30094914)','status_note':'NOT FOR PUBLICATION. settled = identical in both readings, or every arbiter call picks one reader with no low-confidence call; unresolved verses carry both readings.','entries':out},open('kurma_ch1_checked.json','w'),ensure_ascii=False,indent=1)
print(dict(st))
