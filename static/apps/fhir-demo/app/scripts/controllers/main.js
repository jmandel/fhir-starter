'use strict';

angular.module('fhirDemoApp')
.controller('BeginCtrl', function ($scope, $location) {
  $location.path('/given/'+window.initialHash);
  $location.replace();
});

angular.module('fhirDemoApp')
.controller('MainCtrl', function ($scope, $routeParams) {
  var initialHash = $routeParams.initialHash;
  FHIR.oauth2.ready(decodeURIComponent(initialHash), function(smart){
    console.log('set STate', initialHash);

    var calls = {
      'Patient': smart.Patient.where,
      'Condition': smart.Condition.where,
      'Observation': smart.Observation.where,
      'MedicationPrescription': smart.MedicationPrescription.where
    };

    $scope.resourceUrl = function(){
      return 'http://www.hl7.org/implement/standards/fhir/'+$scope.resource.toLowerCase()+'.html';
    };

    Object.keys(calls).forEach(function(resource){
      var call = calls[resource];
      $scope[resource] = function(){
        $scope.resource = resource;
        $scope.url = call.queryUrl();
        $scope.fetchedData = null;
        jQuery.ajax(smart.authenticated({
          type: 'GET',
          url: smart.urlFor(call),
          dataType: 'json',
          data: call.queryParams(),
          traditional: true
        })).done(function(data){
          $scope.fetchedData = JSON.stringify(data, null, 2);
          $scope.$apply();
        });
      };
    });

    $scope.Patient();
    $scope.$apply();

  });

});
