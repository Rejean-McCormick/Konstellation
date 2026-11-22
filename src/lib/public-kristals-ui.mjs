// Editorial navigation labels only; semantic labels remain from the source corpus.
const LABELS = Object.freeze({
 en:'Public Kristals',fr:'Kristals publics',es:'Kristals públicos',de:'Öffentliche Kristals',
 nl:'Openbare Kristals',sv:'Offentliga Kristals',da:'Offentlige Kristals',no:'Offentlige Kristals',
 nn:'Offentlege Kristals',fi:'Julkiset Kristalit',et:'Avalikud Kristalid',af:'Openbare Kristals',
 it:'Kristal pubblici',pt:'Kristals públicos',
});
export function publicKristalsLabel(locale){return LABELS[locale]||LABELS.fr;}
