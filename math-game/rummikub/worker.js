'use strict';
importScripts('model.js?v=20261012-rk1');
self.onmessage = event => {
  try {
    const {observation,level}=event.data;
    self.postMessage({action:self.Rummikub.choose(observation,level)});
  } catch(error) {self.postMessage({error:error.message});}
};
