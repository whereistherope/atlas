// Keep House text-entry controls intact between pointer-down and click.
(function(root){
  'use strict';

  function isHouse(){return !!root.AtlasHouse?.isActive?.()}
  function submitButton(target){
    return target?.closest?.('#atlasHouseBoard [data-widget-action="add-todo"],#atlasHouseBoard [data-list-action="add-item"],#atlasHouseBoard [data-list-action="create-list"]')||null;
  }

  document.addEventListener('pointerdown',event=>{
    if(!isHouse()||!submitButton(event.target))return;
    // Prevent the button from taking focus before its existing click handler runs.
    // The focused input therefore survives any deferred House sync repaint until
    // the click commits the value through the normal Atlas widget action.
    event.preventDefault();
  },true);

  root.AtlasHouseSubmitFocusGuard=Object.freeze({version:'1'});
})(window);
