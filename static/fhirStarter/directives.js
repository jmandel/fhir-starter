angular.module('fhirStarter').directive('focusOnKey', function() {
  var keyToElement = { };
  var listener = function(e){
    if (keyToElement[e.keyCode]){
      keyToElement[e.keyCode].focus();
      e.preventDefault();
      e.stopPropagation();
    }
  };
  angular.element(document).on("keyup", listener);
  return function(scope, elm, attrs) {
    var allowedKeys = scope.$eval(attrs.focusOnKey);
    if (!angular.element.isArray(allowedKeys)){
      allowedKeys = [allowedKeys];
    }
    allowedKeys.forEach(function(k){
      keyToElement[k] = elm;
    });
  };
});

angular.module('fhirStarter').directive('clickOnKey', function() {
  var keyToElement = { };
  var listener = function(e){
    var code = e.keyCode;
    if (e.altKey) code = "alt_"+code;
    if (keyToElement[code]){ 
      keyToElement[code].click();
      e.preventDefault();
      e.stopPropagation();
    }
  };
  angular.element(document).on("keyup", listener);
  return function(scope, elm, attrs) {
    var allowedKeys = attrs.clickOnKey;
    if (!angular.element.isArray(allowedKeys)){
      allowedKeys = [allowedKeys];
    }
    allowedKeys.forEach(function(k){
      keyToElement[k] = elm;
    });
  };
});
