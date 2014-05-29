angular.module('fhirStarter').controller("MainController", 
  function($scope, $route, $rootScope, $location, fhirSettings, patientSearch){
    $scope.showing = {
      settings: false
    }
  }
);

angular.module('fhirStarter').controller("StartController", 
  function($scope, $routeParams, $rootScope, $location, fhirSettings, patientSearch){
  console.log("Start", $routeParams);
  }
);

angular.module('fhirStarter').controller("ErrorsController", 
  function($scope, $rootScope, $route, $routeParams, $location, fhirSettings, oauth2){

    $scope.errors = [];
    $rootScope.$on('error', function(context, e){
      if (e.match(/Search failed/) && oauth2.authorizing()){
        return;
      }
      $scope.errors.push(e);
    })

    $scope.clearError = function(i){
      $scope.errors.splice(i,1);
    }
  });

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
        var newSettings = JSON.parse($scope.settings);
        fhirSettings.set(newSettings);
        $scope.showing.settings = false;
      }

    });

    angular.module('fhirStarter').controller("PatientViewWrapper",  
      function($scope, $routeParams, patientSearch) {
        $scope.loading = true;
        patientSearch.getOne($routeParams.pid).then(function(p){
          $scope.loading = false;
          $scope.patient = p;
        });
        $scope.patientId = function(){
          return $routeParams.pid;
        };
      }
    );

    angular.module('fhirStarter').controller("BindContextController",  
      function($scope, patient, patientSearch, $routeParams, $rootScope, $location, oauth2) {

        $scope.clientName = decodeURIComponent($routeParams.clientName)
        .replace(/\+/, " ");

        $scope.onSelected = $scope.onSelected || function(p){
          var pid = patient.id(p).id;

          patientSearch
          .registerContext({ client_id:'cardiac_risk'}, {patient: pid})
          .then(function(c){
            var to = decodeURIComponent($routeParams.endpoint);
            to = to.replace(/scope=/, "scope=launch:"+c.launch_id+"+");
            return window.location = to;
          });

        };
      });

      angular.module('fhirStarter').controller("PatientSearchController",  
        function($scope, patient, patientSearch, $routeParams, $rootScope, $location, oauth2) {

          $scope.oauth2 = oauth2;

          $scope.onSelected = $scope.onSelected || function(p){
            var pid = patient.id(p).id;
            var loc = "/ui/patient-selected/"+pid;
            if ($routeParams.q == $scope.searchterm) {
              return $location.url(loc); 
            }
            $location.search("q", $scope.searchterm);
            var off = $rootScope.$on("$routeUpdate", function(){
              $location.url(loc);
              off();
            });

          };

          $scope.setLoading = function(){
            $scope.patients = [];
            $scope.loading = true;
          };
          $scope.setLoading();


          $scope.patientHelper = patient;
          $scope.nPerPage = 10;
          $scope.genderglyph = {"F" : "&#9792;", "M": "&#9794;"};
          $scope.searchterm  = typeof $routeParams.q ==="string" && $routeParams.q || "";

          $rootScope.$on('new-client', function(){
            $scope.getMore();
          })

          $scope.nextPage = function(){
            if (!$scope.hasNext()) return;
            $scope.setLoading();
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
          });

          $scope.$watch("searchterm", function(){
            var tokens = [];
            ($scope.searchterm || "").split(/\s/).forEach(function(t){
              tokens.push(t.toLowerCase());
            });
            $scope.tokens = tokens;
            $scope.getMore();
          });

          var loadCount = 0;
          var search = _.debounce(function(thisLoad){
            patientSearch.search({
              "tokens": $scope.tokens, 
              "limit": $scope.nPerPage
            }).then(function(p){
              if (thisLoad < loadCount) {
                return;
              }
              $scope.loading = false;
              $scope.patients = p;
            });
          }, 300);

          $scope.getMore = function(){
            $scope.setLoading();
            search(++loadCount);
          };

        });


        angular.module('fhirStarter').controller("PatientViewController", function($scope, patient, app, patientSearch, $routeParams, $rootScope, $location, fhirSettings, random) {
          $scope.all_apps = [];
          app.success(function(apps){
            $scope.all_apps = apps;
          });
          $scope.patientHelper = patient;
          $scope.fhirServiceUrl = fhirSettings.get().serviceUrl

          $scope.launch = function launch(app){

            /* Hack to get around the window popup behavior in modern web browsers
            (The window.open needs to be synchronous with the click even to
            avoid triggering  popup blockers. */

            var key = random(32);
            window.localStorage[key] = "requested-launch";
            window.open('launch.html?'+key, '_blank');

            patientSearch
            .registerContext(app, {patient: $routeParams.pid})
            .then(function(c){
              console.log(patientSearch.smart());
              window.localStorage[key] = JSON.stringify({
                app: app,
                iss: patientSearch.smart().server.serviceUrl,
                context: c
              });
            });
          }


          $scope.givens = function(name) {
            return name && name.givens.join(" ");
          };

        });
