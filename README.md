# WebVR-template
Simple WebVR wrapper

```javascript
var webvr = new WebVR();
webvr.init();

webvr.onGotVRDisplays(function(displays){
  console.log(displays);
  
  document.querySelector('.enter-vr-button').addEventListener('click', function(){
    webvr.enterVR(vrDisplay, renderer.domElement);
  });
});
```
