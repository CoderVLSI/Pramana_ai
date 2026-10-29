import json,re,unicodedata,os,collections
def n(t): return re.sub(r'[\s।॥\d०-९·ऽ\-\.\!\?,;:()\[\]]+','',unicodedata.normalize('NFC',t))
res={}
for c in (2,3):
    A={e['verse']:e for e in json.load(open(f'vayu_ch{c}_A.json'))['entries']}
    B={e['verse']:e for e in json.load(open(f'vayu_ch{c}_B.json'))['entries']}
    dec=collections.defaultdict(list)
    for f in (f'arb23_out_ch{c}.json',f'arb23_out_ch{c}_redo.json'):
        if os.path.exists(f):
            for r in json.load(open(f)):
                dec[r['verse']].append((f,r))
    # redo supersedes earlier unclear for same verse
    out=[];stat=collections.Counter()
    for k in sorted(A.keys()|B.keys(),key=lambda x:(not x[0].isdigit() and x[0]!='0',x)):
        a,b=A.get(k),B.get(k)
        if k in ('0a','0b','colophon') or not (a and b): 
            e=a or b; out.append({'verse':k,'status':'heading_or_colophon','text':e['text'],'page_index':e['page_index']});continue
        if n(a['text'])==n(b['text']):
            out.append({'verse':k,'status':'identical','text':a['text'],'page_index':a['page_index']});stat['identical']+=1;continue
        rows=dec.get(k,[])
        redo=[r for f,r in rows if 'redo' in f]
        base=[r for f,r in rows if 'redo' not in f]
        final={}
        for r in base: final[r['spot_index']]=r
        for r in redo: final[r['spot_index']]=r
        ds=list(final.values())
        sides={r['decision'] for r in ds}
        low=any(r.get('confidence')=='low' for r in ds)
        if ds and sides<= {'A'} and not low: st,t='settled_A',a['text']
        elif ds and sides<= {'B'} and not low: st,t='settled_B',b['text']
        else: st,t='unresolved',None
        stat[st]+=1
        e={'verse':k,'status':st,'page_index':a['page_index'],'decisions':[(r['spot_index'],r['decision'],r.get('confidence'),r.get('own_reading')) for r in ds]}
        if t: e['text']=t
        else: e['A']=a['text'];e['B']=b['text']
        out.append(e)
    res[c]=out;print(c,dict(stat))
json.dump(res,open('vayu_ch23_checked.json','w'),ensure_ascii=False,indent=1)
