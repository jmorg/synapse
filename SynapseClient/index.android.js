/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
    Alert,
    Animated,
    AppRegistry,
    AsyncStorage,
    Button,
    Dimensions,
    Image,
    Modal,
    PanResponder,
    Slider,
    StyleSheet,
    Text,
    TouchableHighlight,
    View,

} from 'react-native';
import {
    Navigator,
} from 'react-native-deprecated-custom-components';

import { SettingsModal } from './components/SettingsModal';
import { Feed } from './components/Feed';
import { CacheModal } from './components/CachingModals';
import { ImageButton } from './components/ImageButton';
import { DetailModal, ReportModal, DraggableMenuModal} from './components/ReportModal';
import { LoginPage } from './components/LoginPage';
import { IntroSequence } from './components/IntroSequence'
import { SyncModal } from './components/SyncModal';

import Mapbox from 'react-native-mapbox-gl';
Mapbox.setAccessToken('pk.eyJ1Ijoiam1vcmciLCJhIjoiY2owM21ycGdzMDY0NjMycW5qaGo4dTlycyJ9.ugccSJrjmNBQIKKspmAr5w');
import { MapView } from 'react-native-mapbox-gl';

// Initializes request manager, which allows our app to stash requests which are made after a fail
var RequestManager = require('./requestmanager.js');

// Initializes event manager, which ensures that event modifications for users are managed appropriately
var EventManager = require('./eventmanager.js');

// Initializes emitter, which allows RequestManager to communicate with central app
var ee = require('event-emitter');
window.emitter = ee();

// Initializes login

global.userID = -1;
global.userName;

const PADDING_BUFFER = 150 // magic number for padding and buffer

class Draggable extends Component {
    render() {
        return(
            <View style={styles.draggableContainer}>
                <Image source={
                    this.props.name === 'Power Outage' ? require('./images/nopowerpin.png') :
                    this.props.name === 'Water' ? require('./images/waterpin.png') :
                    this.props.name === 'Roadblock' ? require('./images/roadblockpin.png') :
                    this.props.name === 'Gas' ? require('./images/gaspin.png') :
                    this.props.name === 'Food' ? require('./images/foodpin.png') :
                    this.props.name === 'Hospital' ? require('./images/hospitalpin.png') :
                    require('./images/roadblock.png')}
                    resizeMode='contain'
                    style={styles.draggable}/>
            </View>
        );
    }
}


const resolveAssetSource = require('resolveAssetSource');

/*
 * Component to track state for the map and the pins shown to users.
 */
class MapAndOverlay extends Component {

    /*
     * State for the map and draggable pins.
     */
    state = {
        buttonBarStatus: 'pin',
        hideButtons: false,
        userTracking: Mapbox.userTrackingMode.follow,
        annotations: [],
        reportType: "Road Closure", //TODO: to be set by modal after add is clicked
        cost: false,
        type: "",
        description: "",
        showSyncModal: false,
        userID: -1,
    };

    /*
     * componentWillMount is called when component is initialized in DOM.
     * Here, we use it to establish callbacks for requests. When our RequestManager
     * receives data from server, it emits events with attached JSON data which our
     * MapAndOverlay component will listen for.
     */
    componentWillMount() {
        // Requests login when app loads
        if (this.isLoggedOut()) {
            var headerMessage = 'Would you like to login?';
            var bodyMessage = 'Once you are logged in you will be allowed to create and edit Synapse events. You can exit login at any time by clicking the back button.';
            this.promptLogin(headerMessage, bodyMessage)
        }

        var self = this;
        window.emitter.on('PROCESSING:/event/info/all', function() {
            self.setState({
                showSyncModal: true,
            });
        });

        window.emitter.on('PROCESSED:/event/info/all', function(responseData) {
            self.addEventsToMap(responseData);
            self.setState({
              showSyncModal: false,
            });
        });

        window.emitter.on('FAILED:/event/info/all', function() {
            self.setState({
                showSyncModal: false,
            });
        });

        window.emitter.on('PROCESSING:/event/info/bounds/', function() {
            self.setState({
                showSyncModal: true,
            });
        });

        window.emitter.on('PROCESSED:/event/info/bounds/', function(responseData) {
            self.addEventsToMap(responseData);
            self.setState({
              showSyncModal: false,
            });
        });

        window.emitter.on('FAILED:/event/info/bounds/', function() {
            self.setState({
                showSyncModal: false,
            });
        });

        window.emitter.on('PROCESSED:/report/add/', function(responseData) {
            self.addEventToMap(responseData);
            self.setState({
                buttonBarStatus: 'pin',
                showDraggable: false,
                reportModalVisible: false,
            });
        });

        window.emitter.on('FAILED:/event/info/all', function() {
            self.setState({
                showSyncModal: false,
            });
        });
    }

    /*
     *  Callback which takes in JSON data for all Events,
     *  and adds these pins to our map.
     */
    addEventsToMap = (responseData) => {
        this.state.annotations = [];
        global.eventMap = {};
        for (let i = 0; i < responseData.length; i++) { // Loops over each received event
            let currEvent = responseData[i];
            this.addEventToMap(currEvent);
        }
    }

    /*
     *  Adds a single event to the map.
     */
    addEventToMap = (currEvent) => {
        console.log(currEvent);
        global.eventMap[currEvent.event_id] = currEvent;  // Stores event information in a global
        this.setState({   // Sets local state
            annotations: [...this.state.annotations, {
                coordinates: [currEvent.location_lat,currEvent.location_long],
                type: 'point',
                annotationImage: {
                    source: { uri:
                        currEvent.category === 'Food' ? 'foodpin' :
                        currEvent.category === 'Water' ? 'waterpin' :
                        currEvent.category === 'Gas' ? 'gaspin' :
                        currEvent.category === 'Hospital' ? 'hospitalpin' :
                        currEvent.category === 'Power Outage' ? 'nopowerpin' :
                        'roadblockpin' },
                    width: 32,
                    height: 88},
                id: String(currEvent.event_id),
                title: currEvent.category}],
        });
    }

    /*
     *  Submits a request to post a new report to the Synapse platform.
     */
    closeReportModal = () => {
        this.setState({
            buttonBarStatus: 'pin',
            showDraggable: false,
            reportModalVisible: false,
        });
    };


    /*
     * Makes a request to get all events stored on the backend. RequestManager fetches all these
     * events, then sends them to the map to populate pins.
     */
    onUpdate = () => {
      global.mapref.getBounds(bounds => {
        /* bounds = [latSW, lonSW, latNE, lonNE] */
        var r = {'requestType': 'GET',
                'requestUrl': '/event/info/bounds/',
                'bounds': bounds,
                'requestParameters': null};
        RequestManager.makeRequest(r);
      });
    };

    setButtonBarStatus = (status) => {
        this.setState({
            buttonBarStatus: status,
        });
    };

    onCenter = () => {
        this.setState({
            userTracking: Mapbox.userTrackingMode.follow,
        });
    };

    onChangeUserTrackingMode = () => {
        this.setState({
            userTracking: Mapbox.userTrackingMode.none,
        });
    };

    setDraggableName = (name) => {
        this.setState({
            reportType: name,
            buttonBarStatus: 'draggable',
        });
    };

    /*
     * Removes an event from the annotations list
     */
    removeFromAnnotations = (id) => {
       this.state.annotations = this.state.annotations.filter(function(annotation) {
          var include = annotation.id !== id;
          return include;
       });
       this.setState(this.state);
    }

    toggleHideButtons = () => {
        this.setState({
            hideButtons: !this.state.hideButtons
        })
    };

    /*
     * Allows a user to start dropping a pin if the user is currently logged in; otherwise,
     * prompts the user for a login.
     */
    beginPinDrop = () => {
        if (!this.isLoggedOut()) {
            this.setButtonBarStatus('draggableMenu');
        } else {
            var headerMessage = 'You\'re not logged in!';
            var bodyMessage = 'You must be logged in to drop a pin. Would you like to login?';
            this.promptLogin(headerMessage, bodyMessage)
        }
    };

    /*
     * If the user is logged out, opens the Auth0 login flow.
     * If the user is logged in, prompts the user for a logoiut.
     */
    loginButtonClicked = () => {
        if (this.isLoggedOut()) {
            this.login();
        } else {
            var headerMessage = 'You\'re logged in as ' + global.userName;;
            var bodyMessage = 'Would you like to logout?';
            this.promptLogout(headerMessage, bodyMessage)
        }
    }

    /*
     * Returns true if the user is logged out, returns false if the
     * user is currently logged in.
     * Logged In status is determined by hte value of the locally
     * stored user id.
     */
    isLoggedOut = () => {
        return global.userID === -1;
    }

    /*
     * Asks the user if they would like to login, and opens an
     * Auth0 login window if so.
     */
    promptLogin = (headerMessage, bodyMessage) => {
        Alert.alert(
            headerMessage,
            bodyMessage,
            [
                {text: 'Ask me later'},
                {text: 'Yes!', onPress: () => this.login()},
            ],
            { cancelable: true }
        );
    };

    /*
     * Opens an Auth0 Login window.
     */
    login = () => {
        var Auth0Lock = require('react-native-lock');
        var lock = new Auth0Lock({clientId:'6b4LyPEFyj13yTw4tcsuhuv9m7cdbDtt',
                                  domain: 'synapse-mobile.auth0.com'});
        lock.show({closable:true}, (err, profile, token) => {
            if (err) {
                console.log(err);
            } else {
                global.userName = profile.name;
                global.userID = profile.userId;
                this.setState({userID: profile.userId});
            }
        });
    };

    /*
     * Asks the user if they would like to logout, and
     * intiializes logout process if so.
     */
    promptLogout = (headerMessage, bodyMessage) => {
        Alert.alert(
            headerMessage,
            bodyMessage,
            [
                {text: 'No, I\'d rather not.'},
                {text: 'Yes!', onPress: () => this.logout()},
            ],
            { cancelable: true }
        );
    }

    /*
     * Marks the user as logged out by resetting the locally stored
     * user id and user name. Alerts the user that a logout has occurred.
     */
    logout = () => {
        global.userID = -1;
        this.setState({userID: -1});
        global.userName = "";
        Alert.alert("You've been logged out!");
    }

    render() {
        return(
            <View style={styles.overlay}>
              <SyncModal
                modalVisible = {this.state.showSyncModal}
              />
  		        <ReportModal
                    visible={this.state.buttonBarStatus === 'reportModal'}
                    reportType={this.state.reportType}
                    rejectReport={this.setButtonBarStatus.bind(this, 'pin')}
                    acceptReport={this.closeReportModal}
                    mapref={global.mapref}
                    xAndCheck={styles.xAndCheck}
                    buttonBar={styles.buttonBar}
                />

                <View style ={styles.map}>
                    <ReportMap
                        isLoggedOut = {this.isLoggedOut}
                        promptLogin = {this.promptLogin}
                        onOpenAnnotation = {this.setButtonBarStatus.bind(this, 'annotation')}
                        onCloseAnnotation = {this.setButtonBarStatus.bind(this, 'pin')}
                        userTracking = {this.state.userTracking}
                        onChangeUserTrackingMode = {this.onChangeUserTrackingMode}
                        annotations = {this.state.annotations}
                        removeFromAnnotations = {this.removeFromAnnotations}
                        buttonBarStatus = {this.state.buttonBarStatus}
                    />
                </View>

                {this.state.buttonBarStatus === 'pin' && this.state.userTracking === Mapbox.userTrackingMode.none ?
                    <View style={styles.topButtonBar}>
                        <ImageButton
                            imageName={'center'}
                            imageStyle={styles.centerButton}
                            onPress={this.onCenter}
                        />
                    </View> : null }


                {this.state.hideButtons ? null :
                    <View style={styles.buttonBar}>
                        {this.state.buttonBarStatus === 'pin' ? <ImageButton
                                imageName={'settings'}
                                imageStyle={styles.rightSideButtonMedium}
                                onPress={this.setButtonBarStatus.bind(this, 'settings')}
                            /> : null}
                        {this.state.buttonBarStatus === 'pin' ? <ImageButton
                                imageName={'refresh'}
                                imageStyle={styles.rightSideButtonLarge}
                                onPress={this.onUpdate}
                            /> : null}
                        {this.state.buttonBarStatus === 'pin' ? <ImageButton
                                imageName={'pin'}
                                imageStyle={styles.rightSideButtonMedium}
                                onPress={this.beginPinDrop}
                            /> : null}
                        {this.state.buttonBarStatus === 'draggable' ? <ImageButton
                            imageName={'x'}
                            imageStyle={styles.xAndCheck}
                            onPress={this.beginPinDrop}
                        /> : null}
                        {this.state.buttonBarStatus === 'draggable' ? <ImageButton
                            imageName={'check'}
                            imageStyle={styles.xAndCheck}
                            onPress={this.setButtonBarStatus.bind(this, 'reportModal')}
                        /> : null}
                    </View>
                }

                {this.state.buttonBarStatus === 'draggable' ? <Draggable name={this.state.reportType}/> : null}

                <DraggableMenuModal
                    visible={this.state.buttonBarStatus === 'draggableMenu'}
                    onRejectDraggableMenu={this.setButtonBarStatus.bind(this, 'pin')}
                    onPressRoadblock={this.setDraggableName.bind(this,'Roadblock')}
                    onPressWater={this.setDraggableName.bind(this,'Water')}
                    onPressGas={this.setDraggableName.bind(this,'Gas')}
                    onPressHospital={this.setDraggableName.bind(this,'Hospital')}
                    onPressFood={this.setDraggableName.bind(this,'Food')}
                    onPressPowerOutage={this.setDraggableName.bind(this,'Power Outage')}
                    buttonSmall={styles.buttonSmall}
                    buttonBar={styles.buttonBar}
                />

                <SettingsModal
                    onRejectSettingsMenu={this.setButtonBarStatus.bind(this, 'pin')}
                    onGoToMap={this.setButtonBarStatus.bind(this, 'pin')}
                    visible={this.state.buttonBarStatus === 'settings'}
                    buttonSmall={styles.buttonSmall}
                    buttonBar={styles.buttonBar}
                    loginButtonClicked={this.loginButtonClicked}
                    userID={this.state.userID}
                />
            </View>
    	);
	}
}

class ReportMap extends Component {

    state = {
        detailModalVisible: false,
        reportType: "Road Closure",
        // Values associated with most recently clicked marker
        currScore: 0,
        currNumReports: 0,
        currAnnotationID: 0,
    };

    /*
     * componentWillMount is called when component is initialized in DOM.
     * Here, we use it to establish callbacks for requests. When our RequestManager
     * receives data from server, it emits events with attached JSON data which our
     * ReportMap component will listen for.
     */
    componentWillMount() {
        var self = this;

        window.emitter.on('PROCESSED:/event/info/', function(responseData) {
            self.updateEvent(responseData);
        });

        window.emitter.on('PROCESSED:/event/verify/', function(responseData) {
            self.updateEventAfterDisputeOrVerify(responseData);
        });

        window.emitter.on('PROCESSED:/event/dispute/', function(responseData) {
            self.updateEventAfterDisputeOrVerify(responseData);
        });
    }

    /*
     * Updates locally stored event to reflect event stored on the Synapse platform.
     */
    updateEvent = (refreshedEvent) => {
        if (refreshedEvent.deleted === true) {
            this.removeCurrentEvent();
        } else {
            this.state.currScore = refreshedEvent.current_score;
            global.eventMap[this.state.currAnnotationID] = refreshedEvent;
            this.setState(this.state);
        }
    };

    /*
     * Removes the currently viewed event from the global map and the annotations
     * list
     */
    removeCurrentEvent = () => {
          delete global.eventMap[this.state.currAnnotationID];
          Alert.alert('Users have marked this event as unreliable. Removing it!');
          this.props.removeFromAnnotations(this.state.currAnnotationID);
          this.props.onCloseAnnotation();
          this.setState({detailModalVisible: false});
    };

    /*
     * Updates locally stored event with specific values associated with the
     * JSON response given by server after a dispute or verify event.
     */
    updateEventAfterDisputeOrVerify = (responseJson) => {
        if (responseJson.new_score === "Removed") {
            this.removeCurrentEvent();
        } else {
            this.state.currScore = responseJson.new_score;
            global.eventMap[this.state.currAnnotationID].current_score = responseJson.new_score;
            this.setState(this.state);
        }
    };

    /*
     * When a user requests to refresh a specific event, uses our request manager
     * to get information about this specific event.
     */
    onRefresh = () => {
        var r = {'requestType': 'GET',
                 'requestUrl': '/event/info/',
                 'id': this.state.currAnnotationID,
                 'requestParameters': null};
        RequestManager.makeRequest(r);
        Alert.alert('Refreshing your event data!');
    };

    /*
     * When a user disputes a specific event, uses our request manager
     * to make a "POST" request to dispute the given event.
     */
    onDispute = () => {
        if (this.props.isLoggedOut()) {
            var headerMessage = 'You\'re not logged in!';
            var bodyMessage = 'You must be logged in to dispute an event. Would you like to login?';
            this.props.promptLogin(headerMessage, bodyMessage);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                EventManager.disputeEvent(JSON.parse(this.state.currAnnotationID),global.userID, position.coords.latitude, position.coords.longitude);
            });
    };

    /*
     * When a user verifies a specific event, uses our request manager
     * to make a "POST" request to verify the given event.
     */
    onVerify = () => {
        if (this.props.isLoggedOut()) {
            var headerMessage = 'You\'re not logged in!';
            var bodyMessage = 'You must be logged in to verify an event. Would you like to login?';
            this.props.promptLogin(headerMessage, bodyMessage);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                EventManager.verifyEvent(JSON.parse(this.state.currAnnotationID),global.userID, position.coords.latitude, position.coords.longitude);
            });
    };

    // calculates width based on device dimension. assumes data <= 100
    getWidth = () => {
       const deviceWidth = Dimensions.get('window').width - PADDING_BUFFER;
       return this.state.currScore/100 * deviceWidth;
    };

    setDetailModalVisible = (visible) => {
        this.props.onCloseAnnotation();
        this.setState({detailModalVisible: visible});
    };

    openReportDetailModal = (annotation) => {
        if (this.canOpenDetailModal()) {
            this.state.currAnnotationID = annotation.id;
            this.state.currScore = eventMap[annotation.id].current_score;
            this.state.currNumReports = 1;  // TODO: Update when concept of multiple reports per event is added
            this.state.reportType = annotation.title;
            this.state.type = eventMap[annotation.id].type;
            this.state.description = eventMap[annotation.id].description;
            this.state.cost = eventMap[annotation.id].cost;
            this.setDetailModalVisible(true);
            this.props.onOpenAnnotation(); // TODO: setdetailmodalvisible sets the buttonbarstatus to pin, and this resets it. change above method into 2
        }
    };


    /*
     * Checks whether user is in a flow where they have permission to open a detail modal for
     * any event on the map
     */
    canOpenDetailModal = () => {
        return (this.props.buttonBarStatus === 'pin');
    }

    render() {
        return (
            <View style={styles.container}>
                {this.state.detailModalVisible ?
                    <DetailModal
                        currScore = {this.state.currScore}
                        currNumReports = {this.state.currNumReports}
                        reportType = {this.state.reportType}
                        type = {this.state.type}
                        description = {this.state.description}
                        cost = {this.state.cost}
                        onVerify = {this.onVerify}
                        onDispute = {this.onDispute}
                        onRefresh = {this.onRefresh}
                        onClose = {this.setDetailModalVisible.bind(this, false)}
                        buttonSmall={styles.buttonSmall}
                        buttonBar={styles.buttonBar}
                        eventID={"event_mod:" + JSON.parse(this.state.currAnnotationID)}
                /> : null }

                    <MapView
                        ref={map => {global.mapref = map;}}
                        annotations={this.props.annotations}
                        annotationsAreImmutable={true}
                        //initialCenterCoordinate={{latitude: 40.7223, longitude: -73.9878}}
                        accessToken={'pk.eyJ1Ijoiam1vcmciLCJhIjoiY2owM21ycGdzMDY0NjMycW5qaGo4dTlycyJ9.ugccSJrjmNBQIKKspmAr5w'}
                        debugActive={false}
                        direction={0}
                        logoIsHidden={true}
                        attributionButtonIsHidden={true}
                        rotationEnabled={true}
                        scrollEnabled={true}
                        style={styles.map}
                        styleUrl={Mapbox.mapStyles.streets}
                        zoomEnabled={true}
                        pitchEnabled={false}
                        onTap={this.props.onMapTap}
                        //zoomLevel={12}
                        initialZoomLevel={12}
                        onOpenAnnotation={this.openReportDetailModal.bind(this)}
                        onChangeUserTrackingMode={this.props.onChangeUserTrackingMode}
                        annotationsPopUpEnabled={false}
                        userTrackingMode={this.props.userTracking}
                    />
            </View>
        );
    }
}

export default class SynapseClient extends Component {
  render() {
    return (
      <Navigator
        initialRoute={{id: 'LoginPage', name: 'Index'}}
        renderScene={this.renderScene.bind(this)}
      />
    );
  }

  renderScene(route, navigator) {
    var routeId = route.id;
    if (routeId === 'LoginPage') {
      return (
        <LoginPage
          navigator={navigator}/>
      );
    }
    if (routeId === 'IntroSequence') {
      return (
        <IntroSequence
          navigator={navigator}/>
      );
    }
    if (routeId === 'App') {
      return (
        <MapAndOverlay/>
      );
    }
  }
}

// TODO(JTH): Should we make screen size a global? (It appears that rotating the screen does not follow intended behavior -
// we could simply swap the height/width in this case and rerender?)

global.buttonBarPadding = 0.03 * Dimensions.get('window').height;
global.eventMap = {};
global.frButtonScreenHeightSmall = 0.12;
global.frDraggableScreenHeight = 0.24;
global.mapref;

const frCenterButton = 0.07;
const frRightSideMedium = 0.09;
const frRightSideLarge = 0.15;
const styles = StyleSheet.create({
    centerButton: {
        width:  frCenterButton * require('Dimensions').get('window').height,
        height: frCenterButton * require('Dimensions').get('window').height,
    },
    rightSideButtonMedium: {
        width:  frRightSideMedium * require('Dimensions').get('window').height,
        height: frRightSideMedium * require('Dimensions').get('window').height,
    },
    rightSideButtonLarge: {
        margin: 10,
        width:  frRightSideLarge * require('Dimensions').get('window').height,
        height: frRightSideLarge * require('Dimensions').get('window').height,
    },
    buttonBar: {
        height: frButtonScreenHeightSmall * Dimensions.get('window').height,
        position: 'absolute',
        left: buttonBarPadding, //TODO(JTH) change absolute pixel padding to relative
        right: buttonBarPadding,
        flexDirection: 'row',
        bottom: buttonBarPadding,
        justifyContent: 'center',
        alignItems: 'center',
    },
    draggableMenuRow: {
        //flex: 1,
        padding: 30,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    buttonSmall: {
        width: frButtonScreenHeightSmall * require('Dimensions').get('window').height,
        height: frButtonScreenHeightSmall * require('Dimensions').get('window').height,
    },
    xAndCheck: {
        margin: 40,
        width: frButtonScreenHeightSmall * require('Dimensions').get('window').height,
        height: frButtonScreenHeightSmall * require('Dimensions').get('window').height,
    },
    mapPage: {
        flex: 1,
    },
    overlay: {
        flex: 1,
    },
    draggable: {
        width: 32,
        height: 88,
    },
    draggableContainer: {
        position:'absolute',
        top:0,
        bottom:0,
        left:0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyBoxOne: {
        flex: 1,
    },
    emptyBoxEight: {
        flex: 8,
    },
    container: {
        flex: 1
    },
    map: {
        flex: 1
    },

    subheader1: {
    	fontSize: 22,
    },
    subheader2: {
    	fontSize: 16,
    },
    topButtonBar: {
        height: frButtonScreenHeightSmall * Dimensions.get('window').height,
        position: 'absolute',
        left: buttonBarPadding, //TODO(JTH) change absolute pixel padding to relative
        right: buttonBarPadding,
        flexDirection: 'row',
        top: buttonBarPadding,
        justifyContent: 'space-between',
    },
    secondaryTopButtonBar: {
        height: frButtonScreenHeightSmall * Dimensions.get('window').height,
        position: 'absolute',
        left: buttonBarPadding, //TODO(JTH) change absolute pixel padding to relative
        right: buttonBarPadding,
        flexDirection: 'row',
        top: buttonBarPadding*4,
        justifyContent: 'space-between',
    },
});
module.exports = styles;

AppRegistry.registerComponent('SynapseClient', () => SynapseClient);
