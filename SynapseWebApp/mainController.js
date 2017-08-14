'use strict';

var synapse = angular.module('synapse', [
    'ngRoute',
    'auth0',
    'angular-storage',
    'angular-jwt'
]);

synapse.config(['$routeProvider',
    function ($routeProvider) {
        $routeProvider.
            when('/listView', {
                templateUrl: 'components/listView/listViewTemplate.html',
                controller: 'ListViewController',
                requiresLogin: true                
            }).  
            when('/mapView', {
                templateUrl: 'components/mapView/mapViewTemplate.html',
                controller: 'MapViewController',
                requiresLogin: true
            }).
            when('/login', {
                controller: 'LoginController',
                templateUrl: 'components/login/login.html'
            }).
            otherwise({
                redirectTo: '/login'
            });
    }])

.config( function(authProvider) {
    authProvider.init({
        domain: 'synapse-mobile.auth0.com',
        clientID: 'W9NxML5SQhb7Fx2XkB7w4xszWthsBfl4',
        loginUrl: '/login'
    })
});

synapse.controller('MainController', ['$scope', '$rootScope', '$location',
  function ($scope, $rootScope, $location) {
        mapboxgl.accessToken = 'pk.eyJ1Ijoiam1vcmciLCJhIjoiY2owM21ycGdzMDY0NjMycW5qaGo4dTlycyJ9.ugccSJrjmNBQIKKspmAr5w';

        $rootScope.main = {};

        $rootScope.goTo = function(page) {
            $location.path(page);
        }
}])

// Auth0 method to authenticate user upon page refresh
.run(['$rootScope', 'auth', 'store', 'jwtHelper', '$location',
          function($rootScope, auth, store, jwtHelper, $location) {
    $rootScope.$on('$locationChangeStart', function() {
        var token = store.get('token');
        if (token) {
            if (!jwtHelper.isTokenExpired(token)) {
                if (!auth.isAuthenticated) {
                    var profile = store.get('profile');
                    auth.authenticate(store.get('profile'), token);
                }
            } else {
                $location.path('/login');
            }
        }
    });
}]);
