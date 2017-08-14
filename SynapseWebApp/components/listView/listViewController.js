'use strict';

synapse.controller('ListViewController', ['$scope', '$location', 'auth', '$rootScope', '$http', 'store',
  function ($scope, $location, auth, $rootScope, $http, store) {

    // User Management
    var profile = store.get('profile');
    $scope.user = {};
    $scope.user.email = profile ? profile.email : '';

    $scope.logOut = function() {
        auth.signout();
        store.remove('token');
        store.remove('profile');
        $location.path('/login');
    };

    $scope.main = $rootScope.main;    
    $scope.main.data = [];
    $scope.main.curData = $scope.main.data.slice();

    var initFilters = function() {
      $scope.orders = {};
      $scope.categories = {
        'Gas': true,
        'Food': true,
        'Hospital': true,
        'Power Outage': true,
        'Road Closure': true,
        'Water': true,
      };
    };

    $scope.removeFilters = function() {
      initFilters();
      var inputs = document.getElementsByClassName("filled-in");
      
      for (var i = 0; i < inputs.length; i++) {        
        inputs[i].checked = true;
      }      
      $scope.main.curData = $scope.main.data.slice();
    };

    $scope.requestData = function() {
      $scope.removeFilters();
      $http({
        method: 'GET',
        url: '/allData',
      }).then(function success(response) {
          $scope.removeFilters();
          $scope.main.data = response.data.data;          
          $scope.main.curData = $scope.main.data.slice();
        }, function error(response) {
          console.info(response.status);
        });
    };    

    $scope.filterByCategories = function(val) {
      $scope.categories[val] = !$scope.categories[val];
      if($scope.categories[val]) {
        var newEvents = $scope.main.data.filter(function(event){                                  
          return event.category === val;
        });
        for (var event in newEvents) {
          $scope.main.curData.push(newEvents[event]);
        }
      } else {        
        $scope.filterBy('category', val);
      }
    }

    $scope.filterBy = function(fieldType, fieldValue) {
      $scope.categories[fieldType];
      $scope.main.curData = $scope.main.curData.filter(function(event){
        return event[fieldType] !== fieldValue;
      });
    };

    $scope.sortByAttr = function(attr){
      $scope.orders[attr] = !$scope.orders[attr];
      if($scope.orders[attr]){
        $scope.main.curData.sort(function(a, b){
          return a[attr] > b[attr];
        });
      } else {
        $scope.main.curData.sort(function(a, b){
          return a[attr] < b[attr];
        });
      }
    }

    initFilters();
    $scope.requestData();
}]);
