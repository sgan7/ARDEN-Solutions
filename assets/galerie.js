// Visionneuse des photos : tout lien a[data-lb] s'ouvre en grand, avec légende, flèches et Échap.
(function(){
  var links=[].slice.call(document.querySelectorAll('a[data-lb]'));
  if(!links.length)return;
  var box=document.createElement('div');
  box.className='lb';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Photo agrandie');
  box.innerHTML='<button class="x" aria-label="Fermer">×</button><button class="pv" aria-label="Photo précédente">‹</button><img alt=""><p></p><button class="nx" aria-label="Photo suivante">›</button>';
  document.body.appendChild(box);
  var img=box.querySelector('img'),cap=box.querySelector('p'),cur=0,last=null;
  function show(i){
    cur=(i+links.length)%links.length;
    var a=links[cur],t=a.querySelector('img');
    img.src=a.href;img.alt=t?t.alt:'';
    cap.textContent=a.getAttribute('data-lb')||'';
  }
  function close(){box.classList.remove('open');document.body.style.overflow='';if(last)last.focus();}
  links.forEach(function(a,i){a.addEventListener('click',function(e){e.preventDefault();last=a;show(i);box.classList.add('open');document.body.style.overflow='hidden';box.querySelector('.x').focus();});});
  box.querySelector('.x').onclick=close;
  box.querySelector('.pv').onclick=function(){show(cur-1);};
  box.querySelector('.nx').onclick=function(){show(cur+1);};
  box.addEventListener('click',function(e){if(e.target===box)close();});
  document.addEventListener('keydown',function(e){
    if(!box.classList.contains('open'))return;
    if(e.key==='Escape')close();else if(e.key==='ArrowLeft')show(cur-1);else if(e.key==='ArrowRight')show(cur+1);
  });
  var x0=null;
  box.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});
  box.addEventListener('touchend',function(e){if(x0===null)return;var d=e.changedTouches[0].clientX-x0;if(Math.abs(d)>50)show(cur+(d<0?1:-1));x0=null;});
  if(links.length<2){box.querySelector('.pv').style.display='none';box.querySelector('.nx').style.display='none';}
})();
