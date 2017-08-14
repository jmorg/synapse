'use strict';

angular.module('synapse').controller('LoginController',
                          ['$scope', 'auth', '$location', 'store',
                          function($scope, auth, $location, store) {

    // Method to log into the app using authentication tokens. A log in is defined as
    // updating the current path to the notification send page storing the user profile
    // and token
    $scope.logIn = function(profile, idToken) {
        store.set('profile', profile);
        store.set('token', idToken);
        $location.path('/listView');
    };

    // Method to trigger auth0 login UI, and login if user is authenticated
    $scope.loginAttempt = function() {
        auth.signinOnly({
            authParams: {
                scope: 'openid name email user_id' // Specify the scopes you want to retrieve
            }
        }, function(profile, idToken) {
            $scope.logIn(profile, idToken);
        }, function(err) {
        });
    };
}]);
