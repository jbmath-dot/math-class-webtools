'use strict';
importScripts('model.js');
self.onmessage=function(event){
  const {id,...position}=event.data;
  try{self.postMessage({id,...self.AttributeFour.aiAction(position)});}
  catch(error){self.postMessage({id,error:String(error.message||error)});}
};
