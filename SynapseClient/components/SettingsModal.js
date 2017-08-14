/**
 * Created by jhank on 4/26/2017.
 */
import React, { Component } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    ListView,
    Modal,
    NetInfo,
    Text,
    ScrollView,
    StyleSheet,
    TouchableHighlight,
    View,
} from 'react-native';
import {Feed} from './Feed';
import {CacheModal} from './CachingModals';
import {ImageButton} from './ImageButton';

export class SettingsModal extends Component {
    state = {
        // settings, account, cache, feed
        status: 'settings'
    };

    goToSettings = () => {
        this.setState({status: 'settings'});
    };

    goToAccount = () => {
        this.setState({status: 'account'});
    };

    goToCache = () => {
        this.setState({status: 'cache'});
    };

    goToFeed = () => {
        this.setState({status: 'feed'});
    };

    render() {
        return (
            <View>
                <CacheModal
                    onRejectSettingsMenu={this.goToSettings}
                    onGoToMap={this.props.onGoToMap}
                    visible={this.state.status === 'cache'}
                    buttonSmall={this.props.buttonSmall}
                    buttonBar={this.props.buttonBar}
                />
                <Feed
                    onRejectSettingsMenu={this.goToSettings}
                    onGoToMap={this.props.onGoToMap}
                    visible={this.state.status === 'feed'}
                    buttonSmall={this.props.buttonSmall}
                    buttonBar={this.props.buttonBar}
                />
                <SettingsInterface
                    loginButtonClicked={this.props.loginButtonClicked}
                    visible={this.props.visible && this.state.status === 'settings'}
                    onRejectSettingsMenu={this.props.onRejectSettingsMenu}
                    goToAccount={this.goToAccount}
                    goToCache={this.goToCache}
                    goToFeed={this.goToFeed}
                    buttonSmall={this.props.buttonSmall}
                    buttonBar={this.props.buttonBar}
                    userID={this.props.userID}
                />
            </View>
        );
    }
}

class SettingsInterface extends Component {
    render() {
        return (
            <Modal
                transparent={true}
                onRequestClose={this.props.onRejectSettingsMenu}
                style={styles.downloadedCitiesViewContainer}
                visible={this.props.visible}
            >
                <View style={styles.downloadedCitiesHeader}>
                    <View style={styles.headerButtons}/>
                    <View style={{flexDirection: 'column', alignItems: 'center'}}>
                        <Text style={styles.headerTitle}>
                            {'User'}
                        </Text>
                        <Text style={styles.headerTitle}>
                            {'Settings'}
                        </Text>
                    </View>
                    <ImageButton
                        imageName={'back'}
                        imageStyle={styles.headerButtons}
                        onPress={this.props.onRejectSettingsMenu}
                    />
                </View>

                <View style={styles.scrollView}>
                    <TouchableHighlight style={styles.settingsItem} onPress={this.props.loginButtonClicked}>
                        <Text style={styles.headerTitle}>
                            {this.props.userID === -1 ? 'Login' : 'Logout'}
                        </Text>
                    </TouchableHighlight>

                    <TouchableHighlight style={styles.settingsItem} onPress={this.props.goToCache}>
                        <Text style={styles.headerTitle}>
                            {'Cached Cities'}
                        </Text>
                    </TouchableHighlight>

                    <TouchableHighlight style={styles.settingsItem} onPress={this.props.goToFeed}>
                        <Text style={styles.headerTitle}>
                            {'News Feed'}
                        </Text>
                    </TouchableHighlight>
                </View>
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
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.77)',
        flexDirection: 'column',
    },

    settingsItem: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.40)',
        borderBottomWidth: (1),
        borderBottomColor: 'rgba(80,80,80,.77)',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollItemLarge: {
        backgroundColor: 'rgba(0,0,0,0.40)',
        borderBottomWidth: (1),
        borderBottomColor: 'rgba(80,80,80,.77)',
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 20,
        paddingRight: 20,
    },
    scrollItemShortDescription: {
        flex: 2,
        color: '#bfbfbf',
        fontSize: 18,
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