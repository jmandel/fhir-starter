'use strict';

angular.module('fhirDemoApp')
.controller('MainCtrl', function ($scope) {

  BBClient.ready(window.initialHash, function(fhirClient){

    var calls = {
      'Patient': {
        url: '/Patient/'+fhirClient.patientId,
        resource: 'Patient'
      },
      'Condition': {
        url: '/Condition?subject='+fhirClient.patientId,
        resource: 'Condition'
      },
      'Observation': {
        url: '/Observation?subject='+fhirClient.patientId,
        resource: 'Observation'
      },
      'MedicationPrescription': {
        url: '/MedicationPrescription?patient='+fhirClient.patientId,
        resource: 'MedicationPrescription'
      }

    };

    $scope.resourceUrl = function(){
      return 'http://www.hl7.org/implement/standards/fhir/'+$scope.resource.toLowerCase()+'.html';
    };

    Object.keys(calls).forEach(function(resource){
      var call = calls[resource];
      $scope[resource] = function(){
        $scope.url = call.url;
        $scope.resource = resource;
        $scope.fetchedData = null;
        var url = fhirClient.server.serviceUrl + $scope.url;
        jQuery.ajax(fhirClient.authenticated({
          type: 'GET',
          url: url,
          dataType: 'json'
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
