'use strict';

synapse.controller('MapViewController', ['$scope', '$location', 'auth', '$rootScope', '$http', 'store',
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

    const markerWidth = 36;
    const markerHeight = 100;
    const linearOffset = 0;

    $scope.main = $rootScope.main;    
    $scope.main.data = [];
    $scope.main.curData = $scope.main.data.slice();
    $scope.main.markers = [];
    var map;

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
        $scope.updateMap();
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
        $scope.updateMap();
    };

    $scope.filterBy = function(fieldType, fieldValue) {
        $scope.categories[fieldType];
        $scope.main.curData = $scope.main.curData.filter(function(event){
            return event[fieldType] !== fieldValue;
        });
    };    

    $scope.init = function() {
        map = new mapboxgl.Map({
              container: 'map',
            style: 'mapbox://styles/mapbox/streets-v9'
        });
        map.addControl(new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            }
        }));

        $scope.requestData();
        initFilters();
    };

    var setBackgroundImage = function(el, event) {
        switch(event.category){
            case 'Power Outage':
                el.style.backgroundImage = "url(../../images/nopowerpin.png";
                break;
            case 'Water':
                el.style.backgroundImage = "url(../../images/waterpin.png";
                break;        
            case 'Gas':
                el.style.backgroundImage = "url(../../images/gaspin.png";
                break;        
            case 'Food':
                el.style.backgroundImage = "url(../../images/foodpin.png";
                break;  
            case 'Hospital':
                el.style.backgroundImage = "url(../../images/hospitalpin.png";
                break;        
            default:
                el.style.backgroundImage = "url(../../images/roadblockpin.png";
        }
    }

    var constructPopupHTML = function(event) {
        var result = "";
        result += "<h3>"+event.category+"</h3>";
        result += "<p>" +"Score: " +event.current_score+ "</p>";
        result += "<p>" +"Type: " + event.type+ "</p>";
        result += "<p>" +"Time: " + event.time+ "</p>";
        result += "<p>" +"Cost: " + event.cost+ "</p>";
        return result;
    };

    $scope.updateMap = function() {
        for(var i = 0; i < $scope.main.markers.length; i++){
            $scope.main.markers[i].remove();
        }

        $scope.main.markers = [];
        var el;
        for(var i = 0; i < $scope.main.curData.length; i++){
            el = document.createElement('div');
            el.className = 'marker';
            el.style.width = markerWidth + 'px';
            el.style.height = markerHeight + 'px';
            var location = [$scope.main.curData[i].location_long, $scope.main.curData[i].location_lat];
            setBackgroundImage(el, $scope.main.curData[i]);
            $scope.main.markers.push(new mapboxgl.Marker(el, {offset: [-markerWidth / 2, -markerHeight / 2]}));
            $scope.main.markers[i]
              .setLngLat(location)
              .addTo(map)
              .setPopup(new mapboxgl.Popup({offset:25})
                .setLngLat(location)
                .setHTML(constructPopupHTML($scope.main.curData[i])));
        }
    }

    $scope.requestData = function() {    
        $http({
            method: 'GET',
            url: '/allData',
        }).then(function success(response) {
            $scope.removeFilters();
            $scope.main.data = response.data.data;          
            $scope.main.curData = $scope.main.data.slice();
            $scope.updateMap();
        }, function error(response) {
            console.info(response.status);
        });
    };        

    $scope.init();    
}]);