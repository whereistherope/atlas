// Atlas Travel: quiet directional marks for calendar travel cards.
(function(root){
  'use strict';
  function arrowSvg(kind='travel'){
    const path=kind==='depart'?'M5 17.5 19 5.5M12 5.5h7v7':kind==='arrive'?'M5 4.5 19 16.5M12 16.5h7v-7':'M4 11h16M15 6l5 5-5 5';
    const label=kind==='depart'?'Departing travel':kind==='arrive'?'Arriving travel':'Travel';
    return `<svg class="atlas-travel-arrow" viewBox="0 0 24 22" role="img" aria-label="${label}"><path d="${path}"/></svg>`;
  }
  function travelIcon(event){
    const isMelbourne=value=>typeof root.calendarTravelIsMelbourne==='function'&&root.calendarTravelIsMelbourne(value);
    if(isMelbourne(event?.origin))return arrowSvg('depart');
    if(isMelbourne(event?.destination))return arrowSvg('arrive');
    return arrowSvg('travel');
  }
  root.calendarTravelIcon=travelIcon;
  root.AtlasTravelDirection=Object.freeze({version:'1',arrowSvg,travelIcon});
})(window);
