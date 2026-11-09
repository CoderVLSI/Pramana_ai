import json,re,unicodedata,collections
def n(t): return re.sub(r'[\s।॥\d०-९·ऽ\-\.\!\?,;:()\[\]]+','',unicodedata.normalize('NFC',t))
res={}
dec=collections.defaultdict(dict)
for f in ('arbk23_out_1.json','arbk23_out_2.json'):
    for r in json.load(open(f)): dec[(r['chapter'],r['verse'])][r['spot_index']]=r
for c in (2,3):
    A={e['verse']:e for e in json.load(open(f'kurma_ch{c}_A.json'))['entries']}
    B={e['verse']:e for e in json.load(open(f'k23B/kurma_ch{c}_B.json'))['entries']}
    out=[];st=collections.Counter()
    for k in sorted(A.keys()|B.keys(),key=lambda k:(0,int(k)) if k.isdigit() else (1,k)):
        a,b=A.get(k),B.get(k)
        if not(a and b) or not k.isdigit():
            out.append({'verse':k,'status':'heading_or_colophon','A':a and a['text'],'B':b and b['text']});continue
        if n(a['text'])==n(b['text']): out.append({'verse':k,'status':'identical','text':b['text'],'page_index':b['page_index']});st['identical']+=1;continue
        ds=list(dec.get((c,k),{}).values());sides={r['decision'] for r in ds}
        low=any(r.get('confidence')=='low' for r in ds)
        s='settled_A' if ds and sides=={'A'} and not low else 'settled_B' if ds and sides=={'B'} and not low else 'unresolved'
        st[s]+=1
        e={'verse':k,'status':s,'page_index':b['page_index']}
        if s=='settled_A': e['text']=a['text']
        elif s=='settled_B': e['text']=b['text']
        else: e['A']=a['text'];e['B']=b['text'];e['calls']=[(r['spot_index'],r['decision'],r.get('confidence'),r.get('own_reading')) for r in ds]
        out.append(e)
    res[c]=out;print(c,dict(st))
json.dump({'work':'kurma-purana','edition':'Bibliotheca Indica, Calcutta 1890 (b30094914)','status_note':'NOT FOR PUBLICATION','chapters':res},open('kurma_ch23_checked.json','w'),ensure_ascii=False,indent=1)
