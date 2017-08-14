/**
 * Created by jhank on 4/13/2017.
 */

import React, { Component } from 'react';
import {
    Alert,
    AsyncStorage,
    Dimensions,
    Image,
    Keyboard,
    Modal,
    Picker,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,

} from 'react-native';

import { ImageButton } from './ImageButton';
import { SeveritySlider } from './SeveritySlider';
import styles from '../index.android';

// Initializes request manager, which allows our app to stash requests which are made after a fail
var RequestManager = require('../requestmanager.js');
// Initializes event manager, which ensures that event modifications for users are managed appropriately
var EventManager = require('../eventmanager.js');

export class ReportModal extends Component {
    constructor(props){
      super(props);
      this.state = {
        description: '',
        reportModalVisible: false,
        type: 'Other',
        cost: false,
        keyboardShown: false,
      };
    };

    componentWillMount () {
      this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow',
        () => this.setState({keyboardShown: true}));
      this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide',
        () => this.setState({keyboardShown: false}));
    }

    componentWillUnmount() {
      this.keyboardDidShowListener.remove();
      this.keyboardDidHideListener.remove();
    }

    setReportModalVisible = (visible) => {
        this.setState({reportModalVisible: visible});
    };

    onValueChange = (value) => {
        this.setState({
          type: value
        });
    };

    /*
     *  Submits a request to post a new report to the Synapse platform.
     */
    postNewReport = () => {
        var d = new Date().toUTCString();
        this.props.mapref.getBounds(bounds => {
            latitude = bounds[0] + 0.5 * (bounds[2] - bounds[0]);
            longitude = bounds[1] + 0.5 * (bounds[3] - bounds[1]);
            console.log('request cost:' + this.state.cost);
            var requestParameters = {'user_id':global.userID,
                                     'category': this.props.reportType,
                                     'type': this.state.type,
                                     'description': this.state.description,
                                     'cost': this.state.cost,
                                     'location_lat': latitude.toString(),
                                     'location_long': longitude.toString(),
                                     'time': d,
                                   };
            var r = {'requestType': 'POST',
                     'requestUrl': '/report/add/',
                     'requestParameters': JSON.stringify(requestParameters)};
            RequestManager.makeRequest(r);
            this.props.acceptReport();
            this.state.type = 'Other';
        });
    }

    // TODO: is there a better way to dynamically render these?
    render() {
        return(
            <Modal
                animationType={"fade"}
                transparent={true}
                visible={this.props.visible}
                onRequestClose={() => this.setReportModalVisible(false)}
            >
                <View style={modalStyles.reportModal}>
                    <View style={modalStyles.reportModalContent}>
                        <Text style={modalStyles.header}>{this.props.reportType}</Text>
                        <Text style={[modalStyles.detailModalLabel,
                          this.props.reportType === 'Roadblock' ||
                          this.props.reportType === 'Hospital' ||
                          this.props.reportType === 'Food' ||
                          this.props.reportType === 'Water' ||
                          this.props.reportType === 'Gas' ? {} : modalStyles.hidden]}> Type: </Text>
                        <Picker
                          style={[modalStyles.picker, (this.props.reportType === 'Food' || this.props.reportType === 'Water') ? {} : modalStyles.hidden]}
                          selectedValue={this.state.type}
                          onValueChange={(val) => this.setState({type: val})}
                        >
                          <Picker.Item label="Aid Station" value="Aid Station" />
                          <Picker.Item label="Store" value="Store" />
                          <Picker.Item label="Locally Driven" value="Locally Driven" />
                          <Picker.Item label="Other" value="Other" />
                        </Picker>
                        <Picker
                          style={[modalStyles.picker, this.props.reportType === 'Roadblock' ? {} : modalStyles.hidden]}
                          selectedValue={this.state.type}
                          onValueChange={(val) => this.setState({type: val})}
                        >
                          <Picker.Item label="Debris" value="Debris" />
                          <Picker.Item label="Flooding" value="Flooding" />
                          <Picker.Item label="Power Line" value="Power Line" />
                          <Picker.Item label="Accident" value="Accident" />
                          <Picker.Item label="Other" value="Other" />
                        </Picker>
                        <Picker
                          style={[modalStyles.picker, this.props.reportType === 'Hospital' ? {} : modalStyles.hidden]}
                          selectedValue={this.state.type}
                          onValueChange={(val) => this.setState({type: val})}
                        >
                          <Picker.Item label="Hospital" value="Hospital" />
                          <Picker.Item label="Aid Station" value="Aid Station" />
                          <Picker.Item label="Locally Driven" value="Locally Driven" />
                          <Picker.Item label="Other" value="Other" />
                        </Picker>
                        <Picker
                          style={[modalStyles.picker, this.props.reportType === 'Gas' ? {} : modalStyles.hidden]}
                          selectedValue={this.state.type}
                          onValueChange={(val) => this.setState({type: val})}
                        >
                          <Picker.Item label="Gas Station" value="Gas Station" />
                          <Picker.Item label="Aid Station" value="Aid Station" />
                          <Picker.Item label="Locally Driven" value="Locally Driven" />
                          <Picker.Item label="Other" value="Other" />
                        </Picker>
                        <Text style={modalStyles.detailModalLabel}> Description: </Text>
                        <TextInput
                          style={modalStyles.reportModalDescription}
                          onChangeText={(text) => this.setState({
                            description: text
                          })}
                        />
                        <Text style={[modalStyles.detailModalLabel,
                          this.props.reportType === 'Hospital' ||
                          this.props.reportType === 'Food' ||
                          this.props.reportType === 'Water' ||
                          this.props.reportType === 'Gas' ? {} : modalStyles.hidden]}> Cost: </Text>
                        <Switch
                          style={this.props.reportType === 'Hospital' ||
                            this.props.reportType === 'Food' ||
                            this.props.reportType === 'Water' ||
                            this.props.reportType === 'Gas' ? {} : modalStyles.hidden}
                          onValueChange={(value) => {
                            this.setState({cost: value});
                            console.log(value);
                          }}
                          value={this.state.cost} />
                    </View>
                    <View style={this.props.buttonBar}>
                        <ImageButton
                            imageName={'x'}
                            onPress={this.props.rejectReport}
                            imageStyle={[this.state.keyboardShown ? modalStyles.hidden : this.props.xAndCheck]}
                        />
                        <ImageButton
                            imageName={'check'}
                            onPress={this.postNewReport}
                            imageStyle={[this.state.keyboardShown ? modalStyles.hidden : this.props.xAndCheck]}
                        />
                    </View>
                </View>
            </Modal>
        );
    }
}

export class DraggableMenuModal extends Component {
    render() {
        return(
            <Modal transparent={true} visible={this.props.visible} onRequestClose={this.props.onRejectDraggableMenu}>
                <View style={modalStyles.draggableMenuModal}>
                    <View style={modalStyles.draggableMenuRow}>
                        <ImageButton imageName={'Roadblock'} imageStyle={modalStyles.buttonLarge} onPress={this.props.onPressRoadblock}/>
                        <ImageButton imageName={'Water'} imageStyle={modalStyles.buttonLarge} onPress={this.props.onPressWater}/>
                        <ImageButton imageName={'Gas'} imageStyle={modalStyles.buttonLarge} onPress={this.props.onPressGas}/>
                    </View>
                    <View style={modalStyles.draggableMenuRow}>
                        <ImageButton imageName={'Hospital'} imageStyle={modalStyles.buttonLarge} onPress={this.props.onPressHospital}/>
                        <ImageButton imageName={'Food'} imageStyle={modalStyles.buttonLarge} onPress={this.props.onPressFood}/>
                        <ImageButton imageName={'Power Outage'} imageStyle={modalStyles.buttonLarge} onPress={this.props.onPressPowerOutage}/>
                    </View>
                    <View style= {[modalStyles.draggableMenuRow, {justifyContent:'center'}]}>
                        <ImageButton
                            imageName={'x'}
                            imageStyle={modalStyles.buttonLarge}
                            onPress={this.props.onRejectDraggableMenu}
                        />
                    </View>
                </View>
            </Modal>
        );
    }
}

export class SettingsModal extends Component {
    render() {
        return(
            <Modal transparent={true} visible={this.props.visible} onRequestClose={this.props.onRejectSettingsMenu}>
                <View style={modalStyles.settingsModal}>
                    <View style={this.props.buttonBar}>
                        <ImageButton
                            imageName={'x'}
                            onPress={this.props.onRejectSettingsMenu}
                            imageStyle={this.props.buttonSmall}
                        />
                    </View>
                </View>
            </Modal>
        );
    }
}

// TODO: backgroundColor needs to scale correctly
export class DetailModal extends Component {
    state = {
        // none, verify, dispute
        eventStatus: 'none',
        isLoading: true,
    };

    componentWillMount() {
        AsyncStorage.getItem(this.props.eventID).then((result) => {
            //console.log("Check it: " + result);
            this.setState({
                eventStatus: result,
                isLoading: false
            });
        });
    }

    componentWillUnmount() {
        AsyncStorage.setItem(this.props.eventID, this.state.eventStatus);
    }



    onToggleVerify = () => {
        if (this.state.eventStatus === 'verify') {
            this.props.onDispute();
            this.setState({eventStatus: 'none'});
            Alert.alert('You are no longer verifying the event')
        } else if (this.state.eventStatus === 'dispute') {
            this.props.onVerify();
            this.setState({eventStatus: 'none'});
            Alert.alert('You are no longer disputing the event');
        } else {
            this.props.onVerify();
            this.setState({eventStatus: 'verify'});
            Alert.alert('You are verifying the event');
        }
    };

    onToggleDispute = () => {
        if (this.state.eventStatus === 'dispute') {
            this.props.onVerify();
            this.setState({eventStatus: 'none'});
            Alert.alert('You are no longer disputing the event');
        } else if (this.state.eventStatus === 'verify') {
            this.props.onDispute();
            this.setState({eventStatus: 'none'});
            Alert.alert('You are no longer verifying the event')
        } else {
            this.props.onDispute();
            this.setState({eventStatus: 'dispute'});
            Alert.alert('You are disputing the event');
        }
    }
    render() {
        if (this.state.isLoading) {
            return (
                <Modal
                    visible={this.props.visible}
                    transparent={true}
                    onRequestClose={this.props.onClose}
                />);
        }
        return (
            <Modal
                animationType={"fade"}
                transparent={true}
                visible={this.props.visible}
                onRequestClose={this.props.onClose}
            >
                <View style={modalStyles.detailModal}>
                    <View style={modalStyles.detailModalContent}>

                        <View>
                            <View style={modalStyles.detailModalHeaderBlock}>
                                <View style={modalStyles.detailModalTitleBlock}>
                                    <Text style={modalStyles.header}>{this.props.reportType}</Text>
                                    <View style={modalStyles.detailModalElement}>
                                        <Text style={[modalStyles.detailModalLabel,
                                  this.props.reportType === 'Roadblock' ||
                                  this.props.reportType === 'Hospital' ||
                                  this.props.reportType === 'Food' ||
                                  this.props.reportType === 'Water' ||
                                  this.props.reportType === 'Gas' ? {} : modalStyles.hidden]}> Type: </Text>
                                        <Text style={[modalStyles.detailModalSubheader,
                                  this.props.reportType === 'Roadblock' ||
                                  this.props.reportType === 'Hospital' ||
                                  this.props.reportType === 'Food' ||
                                  this.props.reportType === 'Water' ||
                                  this.props.reportType === 'Gas' ? {} : modalStyles.hidden]}>{this.props.type}</Text>
                                    </View>
                                    <View style={modalStyles.detailModalElement}>
                                        <Text style={modalStyles.detailModalLabel}> Description: </Text>
                                        <Text
                                            style={modalStyles.detialModalSubheader}>{this.props.description}</Text>
                                    </View>
                                    <View style={modalStyles.detailModalElement}>
                                        <Text style={[modalStyles.detailModalLabel,
                                  this.props.reportType === 'Hospital' ||
                                  this.props.reportType === 'Food' ||
                                  this.props.reportType === 'Water' ||
                                  this.props.reportType === 'Gas' ? {} : modalStyles.hidden]}> Cost: </Text>
                                        <Text style={[modalStyles.detailModalSubheader ,
                                  this.props.reportType === 'Hospital' ||
                                  this.props.reportType === 'Food' ||
                                  this.props.reportType === 'Water' ||
                                  this.props.reportType === 'Gas' ? {} : modalStyles.hidden]}>{this.props.cost ? "yes" : "free"}</Text>
                              </View>
                            </View>
                            <View></View>
                            <View style={modalStyles.detailModalScore}>
                              <View style={[modalStyles.detailModalScoreCircle, this.props.currScore < -50 ? modalStyles.lowScore : this.props.currScore < 50 ? modalStyles.mediumScore : modalStyles.highScore]}>
                                <Text style={modalStyles.detailModalScoreText}>{this.props.currScore.toFixed(2)}</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                    </View>
                    <View style={this.props.buttonBar}>
                        <ImageButton
                            imageName={'refresh'}
                            onPress={this.props.onRefresh}
                            imageStyle={this.props.buttonSmall}
                        />
                        {
                            this.state.eventStatus === "verify" ?
                                <ImageButton
                                    imageName={'verify'}
                                    onPress={this.onToggleVerify}
                                    imageStyle={this.props.buttonSmall}
                                /> :
                                <ImageButton
                                    imageName={'verifyGray'}
                                    onPress={this.onToggleVerify}
                                    imageStyle={this.props.buttonSmall}
                                />
                        }
                        {
                            this.state.eventStatus === "dispute" ?
                                <ImageButton
                                    imageName={'dispute'}
                                    onPress={this.onToggleDispute}
                                    imageStyle={this.props.buttonSmall}
                                /> :
                                <ImageButton
                                    imageName={'disputeGray'}
                                    onPress={this.onToggleDispute}
                                    imageStyle={this.props.buttonSmall}
                                />
                        }
                        <ImageButton
                            imageName={'x'}
                            onPress={this.props.onClose}
                            imageStyle={this.props.buttonSmall}
                        />
                    </View>
                </View>
            </Modal>
        );
    }
}

global.settingsMenuWidth = 0.30 * Dimensions.get('window').width;
global.frButtonScreenHeightLarge = 0.135;
const modalStyles = StyleSheet.create({
    buttonLarge: {
        width: frButtonScreenHeightLarge * require('Dimensions').get('window').height,
        height: frButtonScreenHeightLarge * require('Dimensions').get('window').height,
    },
    cautionContainer: {
        flexDirection: 'row',
    },
    cautionImage: {
        width: 0.05 * Dimensions.get('window').height,
        height: 0.05 * Dimensions.get('window').height,
    },
    detailModal: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        justifyContent: 'space-between',
        marginTop: 22,
        padding: 20,
    },
    detailModalContent: {
        flexDirection: 'column',
        justifyContent: 'flex-start',
        borderRadius: 20,
        backgroundColor: '#fff',
        padding: 20,
    },
    detailModalHeaderBlock: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailModalTitleBlock: {
        flexDirection: 'column',
    },
    detailModalElement: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      padding: 10,
    },
    detailModalSubheader: {
        fontSize: 16,
    },
    detailModalLabel: {
        color: '#CBCBCB',
        fontSize: 16,
    },
    detailModalScoreCircle: {
        width: 75,
        height: 75,
        borderRadius: 75/2,
        backgroundColor: 'green',
        alignSelf: 'flex-end',
        alignItems: 'center',
        justifyContent: 'center',
    },
    lowScore: {
      backgroundColor: 'red',
    },
    mediumScore: {
      backgroundColor: '#dcf500',
    },
    highScore: {
      backgroundColor: 'green',
    },
    detailModalScoreText: {
        fontSize: 20,
        color: '#fff',

    },
    draggableMenuModal: {
        backgroundColor: 'rgba(0,0,0,0.77)', // TODO: this hex is in two places - make it a constant somewhere
        position: 'absolute',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 25,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    draggableMenuRow: {
        //flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    reportModal: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        justifyContent: 'space-between',
        marginTop: 22,
        padding: 20,
    },
    reportModalContent: {
        flexDirection: 'column',
        justifyContent: 'flex-start',
        borderRadius: 20,
        backgroundColor: '#fff',
        padding: 20,
    },
    settingsModal: {
        backgroundColor: 'rgba(0,0,0,0.77)',
        position: 'absolute',
        width: settingsMenuWidth,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    },
    hidden: {
      height: 0,
      width: 0,
    },
});
