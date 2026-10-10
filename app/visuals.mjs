/* Presentation helpers contain no market data or financial calculations. */
const paths={
 wallet:'<path d="M4 7h15a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14v2M21 11h-5v5h5"/><circle cx="17.5" cy="13.5" r=".6"/>',
 performance:'<path d="M4 4v16h16M8 15l4-4 4 2 4-6M16 7h4v4"/>',
 shield:'<path d="M12 3l8 3v6c0 4-3 7-8 9-5-2-8-5-8-9V6zM8 12l3 3 5-6"/>',
 cash:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9h.01M18 15h.01"/>',
 positions:'<path d="M8 7V4h8v3M3 11h18M9 11v3h6v-3"/><rect x="3" y="7" width="18" height="13" rx="2"/>',
 radar:'<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6-6M3 12h3M12 18v3M18 12h3M12 6v3"/><circle cx="12" cy="12" r="2"/>',
 watch:'<path d="M7 3h10v18l-5-4-5 4z"/>',
 journal:'<path d="M6 3h13v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2M7 3v18M10 8h6M10 12h6M10 16h4"/>',
 profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 currency:'<path d="M3 7h15l-3-3M21 17H6l3 3M6 4L3 7l3 3M18 14l3 3-3 3"/>',
 alerts:'<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4M12 2v2"/>',
 data:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7"/>',
 privacy:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
 history:'<path d="M3 4v5h5M3 9a9 9 0 1 1 0 7M12 7v5l3 2"/>',
 allocation:'<path d="M12 3v9h9M9 3.5a9 9 0 1 0 11.5 11.5M15 3.5a9 9 0 0 1 5.5 5.5H15z"/>',
 scenario:'<path d="M4 18l6-6 4 3 6-10M16 5h4v4M4 4v16h16"/>',
 transaction:'<path d="M4 7h16l-4-4M20 17H4l4 4M16 3l4 4-4 4M8 13l-4 4 4 4"/>'
};
const headings=new Map([
 ['positions',['Mijn posities','My positions','Posities','Positions','Positiedetail','Position detail']],
 ['shield',['Risico & marktstatus','Risk & market status','Risk and market status']],
 ['radar',['Kansen voor 1–5 handelsdagen','Opportunities for 1–5 trading days','Persoonlijke watchlist','Personal watchlist']],
 ['watch',['Watchlist']],['journal',['Recente handelsplannen','Recent trading plans','Recent trade plans','Handelsplannen','Trading plans','Trade plans','Handelsplan vastleggen','Record trading plan']],
 ['alerts',['Koersmeldingen','Price alerts']],['scenario',['Zelf een scenario toetsen','Test your own scenario','Test a manual scenario']],
 ['allocation',['Waarde en concentratie','Value and concentration','Allocatie','Allocation','Allocatie en concentratie','Allocation and concentration']],
 ['history',['Historische administratie','Historical ledger','Historical records','Waardehistorie','Value history','Historische portefeuillewaarde uit waargenomen koersen','Historical portfolio value from observed prices']],
 ['transaction',['Transactiehistorie','Transaction history','Transacties','Transactions','Boekingshistorie','Booking history','Boeking toevoegen','Add booking']],
 ['data',['Import en export','Import and export']],
 ['cash',['USD cash','EUR cash']],
 ['performance',['Resultaten van gekoppelde transacties','Results from linked transactions','Linked transaction results','Gerealiseerd resultaat','Realized result','Handelsresultaat USD','Handelsresultaat EUR','Trading result USD','Trading result EUR','Gerealiseerd handelsresultaat door de tijd','Realized trading result over time','Evaluatie','Review']]
].flatMap(([kind,labels])=>labels.map(label=>[label,kind])));
function headingIcon(kind){return '<svg class="workspace-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+paths[kind]+'</svg>';}

/** Add supporting pictograms without replacing labels, user text or values. */
export function decorateWorkspace(root=document){
 for(const heading of root.querySelectorAll('.card h2')){
  if(heading.querySelector('.workspace-icon')||heading.closest('[data-user-content]'))continue;
  let kind=headings.get(heading.textContent.trim());
  const section=heading.closest('.settings-card');
  if(section)kind=({profile:'profile',currency:'currency',risk:'shield',alerts:'alerts',data:'data',privacy:'privacy'})[section.id.replace('settings-','')];
  const kpi=heading.closest('.dashboard-kpis>.card');
  if(kpi&&kpi.closest('[data-testid="dashboard"]'))kind=['wallet','performance','shield','cash'][[...kpi.parentElement.children].indexOf(kpi)];
  if(!kind)continue;
  heading.classList.add('workspace-heading');
  heading.insertAdjacentHTML('afterbegin',headingIcon(kind));
 }
 const emptyLabels=new Map([
  ['Nog geen watchlistgegevens beschikbaar.','watch'],['Watchlist data unavailable.','watch'],
  ['Nog geen gekoppelde handelsplannen.','journal'],['No linked trade plans.','journal'],
  ['Nog geen handelsplannen.','journal'],['No trading plans yet.','journal'],
  ['Nog geen aandelen toegevoegd.','watch'],['No stocks added yet.','watch']
 ]);
 for(const paragraph of root.querySelectorAll('.card>p,.card>.watchlist>p')){
  if(paragraph.closest('[data-user-content]'))continue;
  const kind=emptyLabels.get(paragraph.textContent.trim()),card=paragraph.closest('.card');
  if(!kind||card.querySelector('.workspace-illustration'))continue;
  card.classList.add('workspace-empty');
  paragraph.insertAdjacentHTML('beforebegin',workspaceIllustration(kind));
 }
}

/** Neutral empty-workspace artwork: a document, not invented performance. */
export function workspaceIllustration(kind='journal'){
 const symbol=paths[kind]||paths.journal;
 return '<svg class="workspace-illustration" viewBox="0 0 120 84" aria-hidden="true" focusable="false"><rect x="5" y="6" width="110" height="72" rx="22" fill="#edf7ff"/><rect x="27" y="14" width="66" height="56" rx="10" fill="#fff" stroke="#c7e1f1"/><path d="M39 56h42M39 62h28" fill="none" stroke="#c7e1f1" stroke-width="3" stroke-linecap="round"/><g transform="translate(46 23)" fill="none" stroke="#0878ad" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+symbol+'</g></svg>';
}
