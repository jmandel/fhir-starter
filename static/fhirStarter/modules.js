angular.module('fhirStarter', ['ngAnimate', 'ngRoute','ngSanitize'], function($routeProvider, $locationProvider){

  $routeProvider.when('/ui/select-patient', {
    templateUrl:'fhirStarter/templates/select-patient.html',
    reloadOnSearch:false
  }) 

  $routeProvider.when('/resolve/:context/against/:iss/for/:clientName/then/:endpoint', {
    templateUrl:'fhirStarter/templates/resolve.html'
  }) 

  $routeProvider.when('/', {templateUrl:'fhirStarter/templates/start.html'});

  $routeProvider.when('/ui/patient-selected/:pid', {
    templateUrl:'fhirStarter/templates/patient-selected.html',
  });

  $routeProvider.when('/ui/authorize', {
    templateUrl:'fhirStarter/templates/authorize-app.html',
  });

  $locationProvider.html5Mode(false);

});
