/**
 * Created by jhank on 4/26/2017.
 */
import React, { Component } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Modal,
    NetInfo,
    Text,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import {ImageButton} from './ImageButton';
import Mapbox from 'react-native-mapbox-gl';
var {GooglePlacesAutocomplete} = require('react-native-google-places-autocomplete');

const homePlace = {description: 'Home', geometry: { location: { lat: 48.8152937, lng: 2.4597668 } }};
const workPlace = {description: 'Work', geometry: { location: { lat: 48.8496818, lng: 2.2940881 } }};

export class PlacesModal extends Component {
    render() {
        return (
            <View style={{flex: 1, flexDirection: 'column'}}>
                <View style={styles.selectCitiesHeader}>
                    <View style={styles.headerButtons}/>
                    <View style={{flexDirection: 'column', alignItems: 'center'}}>
                        <Text style={styles.headerTitle}>
                            {'Select'}
                        </Text>
                        <Text style={styles.headerTitle}>
                            {'City'}
                        </Text>
                    </View>
                    <ImageButton
                        imageName={'back'}
                        imageStyle={styles.headerButtons}
                        onPress={this.props.onSwap}
                    />
                </View>
                <GooglePlacesAutocomplete
                    placeholder='Search'
                    minLength={2} // minimum length of text to search
                    autoFocus={false}
                    listViewDisplayed='auto'    // true/false/undefined
                    fetchDetails={true}
                    renderDescription={(row) => row.description} // custom description render
                    onPress={(data, details = null) => { // 'details' is provided when fetchDetails = true
                        Mapbox.setAccessToken(accessToken);
                        Mapbox.getOfflinePacks()
                            .then(packs => {
                                for(let i = 0; i < packs.length; i++) {
                                    if(details.name == packs[i].name) {
                                        this.props.onSwap();
                                        Alert.alert(details.name + ' is already downloaded');
                                        return;
                                    }
                                }
                                console.log(details);
                                this.props.configureDownloadListeners();
                                this.props.changeStatusToDownloading();
                                Mapbox.addOfflinePack({
                                    name: details.name, // required
                                    type: 'bbox', // required, only type currently supported`
                                    bounds: [ // required. The corners of the bounded rectangle region being saved offline
                                        details.geometry.viewport.northeast.lat, details.geometry.viewport.northeast.lng,
                                        details.geometry.viewport.southwest.lat, details.geometry.viewport.southwest.lng
                                    ],
                                    minZoomLevel: 9, // required
                                    maxZoomLevel: 14, // required
                                    styleURL: Mapbox.mapStyles.streets // required. Valid styleURL
                                }).then(() => {
                                    this.props.onSwap();
                                }).catch(err => {
                                    console.error(err); // Handle error
                                });
                                    }).catch(err => {
                                        console.error(err);
                                });
                    }}
                    getDefaultValue={() => {
                        return ''; // text input default value
                    }}
                    query={{
                        // available options: https://developers.google.com/places/web-service/autocomplete
                        key: 'AIzaSyD5NaBSciXFbUquHx74IlgqEb-KuLqIo0Y', //jordanhank1@gmail.com
                        language: 'en', // language of the results
                        types: '(cities)', // default: 'geocode'
                    }}
                    styles={{
                        container: {
                            backgroundColor: 'rgba(0,0,0,.77)',
                        },
                        description: {
                            color: '#bfbfbf',
                            fontSize: 15,
                        },
                        textInputContainer: {
                            backgroundColor: 'rgba(0,0,0,0.40)',
                            borderTopWidth: 0,
                            borderBottomColor: 'rgba(80,80,80,.77)',
                            borderBottomWidth: (1),
                        },
                        textInput: {
                            backgroundColor: '#4d4d4d',
                            color: '#bfbfbf',
                        },
                        poweredContainer: {
                            backgroundColor: 'rgba(0,0,0,0)',
                        },
                        loader: {
                            backgroundColor: 'rgba(0,0,0,.77)',
                        },
                        predefinedPlacesDescription: {
                            color: '#bfbfbf',
                        },
                    }}

                    currentLocation={false} // Will add a 'Current location' button at the top of the predefined places list
                    currentLocationLabel="Current location"
                    nearbyPlacesAPI='GooglePlacesSearch' // Which API to use: GoogleReverseGeocoding or GooglePlacesSearch
                    GoogleReverseGeocodingQuery={{
                        key: 'AIzaSyBgf1Sx3Cm4QeZ0Oym9g-yMSVEDDH6auF4' // available options for GoogleReverseGeocoding API : https://developers.google.com/maps/documentation/geocoding/intro
                    }}
                    GooglePlacesSearchQuery={{
                        // available options for GooglePlacesSearch API : https://developers.google.com/places/web-service/search
                        rankby: 'distance',
                        types: 'food',
                    }}

                    filterReverseGeocodingByTypes={['locality', 'administrative_area_level_3']} // filter the reverse geocoding results by types - ['locality', 'administrative_area_level_3'] if you want to display only cities


                    debounce={200} // debounce the requests in ms. Set to 0 to remove debounce. By default 0ms.
                    //renderLeftButton={() => <Image source={require("../images/Verify.png")} />}
                    //renderRightButton={() => <Text>Custom text after the input</Text>}
                />
            </View>
        );
    }
}
export class CachedLocationsPage extends Component {

    componentWillUnmount() {
        this.subscription.remove();
    }

    constructor(props) {
        super(props);
        Mapbox.setAccessToken(accessToken);
        this.props.updatePacks();
        this.subscription = Mapbox.addOfflineErrorListener(payload => {
            console.log(`Offline pack named ${payload.name} experienced an error: ${payload.error}`);
        });
    }

    render() {
        cachedCities = this.props.packs.map(function(pack){
            return (
                <Pack
                    key={pack.name}
                    packName={pack.name}
                    rightDisplayElement={
                        this.props.packs[this.props.packs.length - 1].name !== pack.name || this.props.status === 'idle' ? 'x' :
                        this.props.status === 'downloading' ? this.props.activePackDownloadStatus :
                        'cleaning'
                    }
                    updateParent={this.props.updatePacks}
                />
            )
        },this);

        return (
            <View style={styles.downloadedCitiesViewContainer}>
                <View style={styles.downloadedCitiesHeader}>
                    <ImageButton
                        imageName={'download'}
                        imageStyle={styles.headerButtons}
                        onPress={
                            this.props.status == 'idle' ? this.props.onSwap :
                            this.props.status == 'downloading' ?
                                () => {Alert.alert('Please wait until the active download is complete')} :
                                () => {Alert.alert('Please wait until the cleaning process is complete')}
                        }
                    />
                    <View style={{flexDirection: 'column', alignItems: 'center'}}>
                        <Text style={styles.headerTitle}>
                            {'Downloaded'}
                        </Text>
                        <Text style={styles.headerTitle}>
                            {'Cities'}
                        </Text>
                    </View>
                    <ImageButton
                        imageName={'back'}
                        imageStyle={styles.headerButtons}
                        onPress={this.props.onGoToMap}
                    />
                </View>
                <ScrollView style={styles.scrollView} stickyHeaderIndices={[0]}>
                    {cachedCities}
                </ScrollView>
            </View>

        );
    }
}

class Pack extends Component {
    deletePack = (updateParent, packName) => {
        Mapbox.removeOfflinePack(packName)
            .then(info => {
                if (info.deleted) {
                    Alert.alert(packName + ' has been deleted.')
                } else {
                    console.log('No packs to delete'); // There are no packs named packName
                }
            })
            .catch(err => {
                console.error(err); // Handle error
            });

        updateParent();
    };

    render () {
        return (
            <View style={styles.scrollItem}>
                <Text style={styles.packName}>{this.props.packName}</Text>
                {
                    this.props.rightDisplayElement === 'x' ?
                    <ImageButton
                        imageName={'grayX'}
                        imageStyle={styles.grayX}
                        onPress={this.deletePack.bind(this, this.props.updateParent, this.props.packName)}
                    /> :
                    this.props.rightDisplayElement === 'cleaning' ?
                    <Text style={styles.packName}> {"cleaning up"} </Text> :
                    <Text style={styles.packName}> {this.props.rightDisplayElement + "%"} </Text>
                }
            </View>
        );
    }
}

export class CacheModal extends Component {
    state = {
        //idle, downloading, deleting, cleaning
        status: 'idle',
        activePackDownloadStatus: 100,
        isLocationPage: true,
        packs: [],
    };

    onSwap = () => {
        this.setState({
            isLocationPage: !this.state.isLocationPage
        });
    };

    changeStatusToDownloading = () => {
        this.setState({
            status: 'downloading'
        });
    };

    getOfflinePacks = () => {
        Mapbox.getOfflinePacks()
            .then(packs => {
                this.setState({packs: packs});
            }).catch(err => {
                console.error(err);
        });
    };

    removePack = () => {
        this.setState({status: 'cleaning'});
        Alert.alert('Connection lost while downloading ' + this.state.packs[this.state.packs.length - 1].name);
        this._offlineProgressSubscription.remove();
        NetInfo.isConnected.removeEventListener(
            'change',
            this.removePack
        );
        Mapbox.removeOfflinePack(this.state.packs[this.state.packs.length - 1].name)
            .then(info => {
                if (info.deleted) {
                    this.setState({status: 'idle'});
                    this.getOfflinePacks();
                } else {
                    console.log('No packs to delete'); // There are no packs named packName
                }
            })
            .catch(err => {
                console.error(err); // Handle error
            });
    };

    configureDownloadListeners = () => {
        NetInfo.isConnected.addEventListener(
            'change',
            this.removePack
        );

        this._offlineProgressSubscription = Mapbox.addOfflinePackProgressListener(progress => {
            if (progress != null) {
                let downloadPercent = 100 * (progress.countOfResourcesCompleted) / (progress.countOfResourcesExpected);
                downloadPercent = downloadPercent.toFixed(0);
                if (downloadPercent == 100) {
                    this.setState({status: 'idle'});
                    NetInfo.isConnected.removeEventListener(
                        'change',
                        this.removePack
                    );
                    this._offlineProgressSubscription.remove();
                }
                this.setState({activePackDownloadStatus: downloadPercent});
            }
        });
    };

    render() {
        return (
            <Modal visible={this.props.visible} transparent={true} onRequestClose={this.props.onRejectSettingsMenu}>
                {
                    this.state.isLocationPage ?
                        <CachedLocationsPage
                            onSwap={this.onSwap}
                            onGoToMap={this.props.onRejectSettingsMenu}
                            buttonSmall={this.props.buttonSmall}
                            buttonBar={this.props.buttonBar}
                            activePackDownloadStatus={this.state.activePackDownloadStatus}
                            updatePacks={this.getOfflinePacks}
                            packs={this.state.packs}
                            status={this.state.status}
                        /> :
                        <PlacesModal
                            onSwap={this.onSwap}
                            changeStatusToDownloading={this.changeStatusToDownloading}
                            configureDownloadListeners={this.configureDownloadListeners}
                        />
                }
            </Modal>

        );
    }
}

const accessToken = 'pk.eyJ1Ijoiam1vcmciLCJhIjoiY2owM21ycGdzMDY0NjMycW5qaGo4dTlycyJ9.ugccSJrjmNBQIKKspmAr5w';
const frGrayXSize = 0.055;
const frHeaderButtons = 0.07;
const styles = StyleSheet.create({
    downloadedCitiesViewContainer: {
        flex: 1,
        flexDirection: 'column',
    },
    scrollView: {
        backgroundColor: 'rgba(0,0,0,0.77)',
    },
    // I know these share a lot of similarities, but apparently it is better for optimizations if they are separate?
    scrollItem: {
        height: 70,
        backgroundColor: 'rgba(0,0,0,0.40)',
        borderBottomWidth: (1),
        borderBottomColor: 'rgba(80,80,80,.77)',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 20,
        paddingRight: 20,
    },

    downloadedCitiesHeader: {
        height: 100,
        backgroundColor: 'rgba(0,0,0,0.93)',
        borderBottomWidth: (1),
        borderBottomColor: 'rgba(80,80,80,.77)',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 20,
        paddingRight: 20,
    },

    selectCitiesHeader: {
        height: 100,
        backgroundColor: 'rgba(0,0,0,0.93)',
        borderBottomColor: 'rgba(80,80,80,.77)',
        borderBottomWidth: (1),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 20,
        paddingRight: 20,
    },
    scrollHeaderAdjustment: {
        backgroundColor: 'rgba(0,0,0,0.93)',
        height: 100,
    },
    packName: {
        color: '#bfbfbf',
        fontSize: 22,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: '#bfbfbf',
        fontSize: 24,
    },
    headerButtons: {
        width: 40,
        height: 40,
        // width: frHeaderButtons * Dimensions.get('window').height,
        // height: frHeaderButtons * Dimensions.get('window').height,
    },
    grayX: {
        width: 25,
        height: 25,
        // width: frGrayXSize * Dimensions.get('window').height,
        // height: frGrayXSize * Dimensions.get('window').height,
    }

});