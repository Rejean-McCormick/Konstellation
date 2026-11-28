// Viewport presentation: the existing reader stays mounted, with its current time,
// source, controls and export consent. No change to SVG or exported bytes.
export function bindPresentationMode(root, button, { enterLabel='Mode présentation', exitLabel='Quitter la présentation', onChange=()=>{} }={}) {
  const doc=root.ownerDocument;
  let active=false, previousRole, previousModal, blocked=[];
  function restore(name,value) { if(value===null)root.removeAttribute(name);else root.setAttribute(name,value); }
  function updateButton(){button.textContent=active?exitLabel:enterLabel;button.setAttribute('aria-pressed',String(active));}
  function close(restoreFocus=true){
    if(!active)return;
    active=false;root.classList.remove('kg-presenting');restore('role',previousRole);restore('aria-modal',previousModal);
    for(const sibling of blocked)sibling.removeAttribute('inert');blocked=[];
    doc.removeEventListener('keydown',onKey,true);updateButton();onChange(false);
    if(restoreFocus&&button.isConnected&&!button.disabled)button.focus({preventScroll:true});
  }
  function onKey(event){if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();event.stopPropagation();close();}}
  function open(){
    if(active||button.disabled||!root.isConnected||doc.querySelector('.kg-presenting'))return;
    previousRole=root.getAttribute('role');previousModal=root.getAttribute('aria-modal');
    // Keep all ancestor paths interactive, but disable their other branches.
    // Never remove an inert attribute owned by another component.
    for(let node=root;node.parentElement&&node!==doc.body;node=node.parentElement){
      for(const sibling of node.parentElement.children){
        if(sibling!==node&&!sibling.hasAttribute('inert')&&!['SCRIPT','STYLE','LINK','TEMPLATE'].includes(sibling.tagName)){
          sibling.setAttribute('inert','');blocked.push(sibling);
        }
      }
    }
    active=true;root.classList.add('kg-presenting');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
    doc.addEventListener('keydown',onKey,true);updateButton();onChange(true);button.focus({preventScroll:true});
  }
  const toggle=()=>active?close():open();
  button.addEventListener('click',toggle);updateButton();
  return {get active(){return active;},close,destroy(){button.removeEventListener('click',toggle);close(false);}};
}
