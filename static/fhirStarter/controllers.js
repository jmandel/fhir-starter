angular.module('fhirStarter').controller("MainController", 
  function($scope, $rootScope, $route, $routeParams, $location, fhirSettings){
    $scope.showing = {
      settings: false
    }
  }
);

angular.module('fhirStarter').controller("SettingsController", 
  function($scope, $rootScope, $route, $routeParams, $location, fhirSettings){

    $scope.existing = { }
    $scope.settings = JSON.stringify(fhirSettings.get(),null,2);
    $scope.servers = fhirSettings.servers.map(function(server){
      return {
        value: JSON.stringify(server, null, 2),
        title: server.name
      }
    });

    $scope.save = function(){
      fhirSettings.set(JSON.parse($scope.settings));
      $scope.showing.settings = false;
    }

    $scope.oauth = function(){
      var client = {
        "client_name": "SMART FHIR Starter",
        "client_uri": "https://github.com/jmandel/fhir-starter",
        "logo_uri": "http://wiki.hl7.org/images/1/15/FHIR.png",
        "contacts": [ "info@smartplatforms.org" ],
        "redirect_uris": [window.location.origin + window.location.pathname],
        "response_types": ["token"],
        "grant_types": ["implicit"],
        "token_endpoint_auth_method": "none",
        "scope":  "fhir-complete"
      };

      var provider = {
        "name": "Local Testing Hospital",
        "description": "Just on a developer's machine",
        "url": "http://bbplus-ri.aws.af.cm",
        "oauth2": {
          "registration_uri": "http://bbplus-ri.aws.af.cm/register",
          "authorize_uri": "http://bbplus-ri.aws.af.cm/authorize",
          "token_uri": "http://bbplus-ri.aws.af.cm/token"
        },
        "bb_api":{
          "fhir_service_uri": "https://api.fhir.me/fhir"
        }
      };

      BBClient.authorize({client: client, provider: provider});
    }


  });

  angular.module('fhirStarter').controller("PatientViewWrapper",  
    function($scope, $routeParams, patientSearch) {
      $scope.patient = patientSearch.getOne($routeParams.pid);
      $scope.patientId = function(){
        return $routeParams.pid;
      };
    }
  );

  angular.module('fhirStarter').controller("SelectPatientController",  

    function($scope, patient, patientSearch, $routeParams, $rootScope, $location) {
      $scope.onSelected = function(p){
        var pid = patient.id(p).id,
        loc = "/ui/patient-selected/"+pid;
        $location.url(loc);
      };
    });

    angular.module('fhirStarter').controller("PatientSearchController",  
      function($scope, patient, patientSearch, $routeParams, $rootScope, $location) {
        $scope.patientHelper = patient;
        $scope.loading = true;
        $scope.patients = [];
        $scope.nPerPage = 10;
        $scope.genderglyph = {"F" : "&#9792;", "M": "&#9794;"};
        $scope.searchterm  = typeof $routeParams.q ==="string" && $routeParams.q || "";

        $rootScope.$on('new-settings', function(){
          console.log("redo search with new settings");
          $scope.getMore();
        })

        $scope.nextPage = function(){
          if (!$scope.hasNext()) return;
          $scope.loading = true;
          patientSearch.next().then(function(p){
            $scope.loading = false;
            $scope.patients = p;
          });
        };

        $scope.previousPage = function(){
          if (!$scope.hasPrevious()) return;
          $scope.patients = patientSearch.previous();
        };

        $scope.select = function(i){
          console.log("select called", i);
          $scope.onSelected($scope.patients[i]);
        };


        $scope.hasPrevious = function(){
          return patientSearch.atPage() > 0
        };

        $scope.hasNext = function(){
          return $scope.patients.length === $scope.nPerPage;
        };

        $scope.$watch("patients", function(p){
          var nBlanks = $scope.nPerPage - $scope.patients.length;
          $scope.blanks = [];
          for (var i=0; i<nBlanks; i++){
            $scope.blanks.push("blankline"); 
          }
          console.log($scope.patients, "Blanks: " + $scope.blanks.length);
        });

        $scope.$watch("searchterm", function(){
          var tokens = [];
          ($scope.searchterm || "").split(/\s/).forEach(function(t){
            tokens.push(t.toLowerCase());
          });
          $scope.loading = true;
          $scope.tokens = tokens;
          $scope.getMore();
        });

        $scope.getMore = _.debounce(function(){
          $scope.loading = true;
          patientSearch.search({
            "tokens": $scope.tokens, 
            "limit": $scope.nPerPage
          }).then(function(p){
            $scope.loading = false;
            $scope.patients = p;
          });
        }, 250);
      }
    );


    angular.module('fhirStarter').controller("AuthorizeAppController",  
      function($scope, authorization, patient, patientSearch, $routeParams, $rootScope, $location) {
        $scope.patientHelper = patient;
        $scope.patientName = "(choose below)";

        $scope.onSelected = function(p){
          $scope.patient = p;
          $scope.patientName = patient.name(p) ;
          console.log("selecteD", p);
        };

        $scope.requestedScope = function(){
          if (!$scope.txn) {
            return null;
          }
          if (!$scope.txn.req.scope) {
            return "patient" // default scope
          }
          if ($scope.txn && $scope.txn.req.scope.indexOf("patient") !== -1){
            return "patient";
          }
          if ($scope.txn && $scope.txn.req.scope.indexOf("user") !== -1){
            return "user";
          }
          throw "Unrecognized scope";
        };

        $scope.needPatient = function(){
          return ($scope.requestedScope() === "patient" && 
          $scope.txn.req.patient === undefined);
        };

        $scope.decide = function(allow){
          var params = {};
          if ($scope.patient){
            params.patient = patient.id($scope.patient);
          }
          authorization.decide($scope.txn, allow, params);
        };

        $scope.allow = function(){
          $scope.decide(true);
        };

        $scope.deny = function(){
          $scope.decide(false);
        };

        authorization.transactionDetails($location.search().transaction_id)
        .success(function(t){
          $scope.txn = t;
          if (t.req.patient) {
            patientSearch.getOne(t.req.patient).success(function(p){
              $scope.patient = p;
              $scope.onSelected(p);
              $scope.$apply();
            });
          };
          $scope.$apply();
        });

      }
    );
    angular.module('fhirStarter').controller("PatientViewController", function($scope, patient, app, patientSearch, $routeParams, $rootScope, $location, fhirSettings) {
      $scope.all_apps = app.getApps();
      $scope.patientHelper = patient;
      $scope.fhirServiceUrl = fhirSettings.get().serviceUrl
      $scope.patientView = function() {
        return ($scope.patient && angular.toJson($scope.patient, true));
      };

      $scope.givens = function(name) {
        return name && name.givens.join(" ");
      };

    });
