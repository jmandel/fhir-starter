angular.module('fhirStarter', ['ngRoute','ngSanitize'], function($routeProvider, $locationProvider){

  $routeProvider.when('/ui/select-patient', {
    templateUrl:'fhirStarter/templates/select-patient.html',
    reloadOnSearch:false
  }) 

  $routeProvider.when('', {redirectTo:'/ui/select-patient'});

  $routeProvider.when('/ui/patient-selected/:pid', {
    templateUrl:'fhirStarter/templates/patient-selected.html',
  });

  $routeProvider.when('/ui/authorize', {
    templateUrl:'fhirStarter/templates/authorize-app.html',
  });

  $locationProvider.html5Mode(false);

});
