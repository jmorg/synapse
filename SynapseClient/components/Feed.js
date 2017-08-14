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
import {ImageButton} from './ImageButton';

let messageList = [
  {
    title: 'Welcome to Synapse',
    description: 'Thanks for downloading synapse! This is the newsfeed - ' +
    'you should find updates from NGOs and Governments here in the event of a ' +
    'disaster',
    org: 'The Synapse Team',
    date: ''
  }
];

const messagesPerPage = 5;
export class Feed extends Component {
    state = {
        currentIndex: 0,
        curMessageList: [],
    };

    componentWillMount () {
      this.populateMessages(0);
    };

    populateMessages = (index) => {
      let curMessages = [];
      for (let i = index; i < index + messagesPerPage && i < messageList.length; i++) {
          curMessages.push(messageList[i]);
      }
      this.setState({
          currentIndex: index,
          curMessageList: curMessages,
      });
    }

    goToNextPage = () => {
        let index = this.state.currentIndex + messagesPerPage < messageList.length ? this.state.currentIndex + messagesPerPage : messageList.length - 1;
        this.populateMessages(index);
    };

    goToLastPage = () => {
        let index = this.state.currentIndex < messagesPerPage ? 0 : this.state.currentIndex - messagesPerPage;
        this.populateMessages(index);
    };

    render() {
        messages = this.state.curMessageList.map(function(message){
            return (
                <Message
                    key={message}
                    title={message.title}
                    date = {message.date}
                    description={message.description}
                    org={message.org}
                />
            )
        },this);

        return (
            <Modal
                transparent={true}
                onRequestClose={this.props.onRejectSettingsMenu}
                style={styles.downloadedCitiesViewContainer}
                visible={this.props.visible}
            >
                <View style={styles.downloadedCitiesHeader}>
                    <View style={styles.headerButtons}/>
                    <ImageButton
                        imageName={'lastpage'}
                        imageStyle={styles.headerButtons}
                        onPress={this.goToLastPage}
                    />
                    <View style={{flexDirection: 'column', alignItems: 'center'}}>
                        <Text style={styles.headerTitle}>
                            {'News'}
                        </Text>
                        <Text style={styles.headerTitle}>
                            {'Feed'}
                        </Text>
                    </View>
                    <ImageButton
                        imageName={'nextpage'}
                        imageStyle={styles.headerButtons}
                        onPress={this.goToNextPage}
                    />
                    <ImageButton
                        imageName={'back'}
                        imageStyle={styles.headerButtons}
                        onPress={this.props.onRejectSettingsMenu}
                    />
                </View>
                <ScrollView style={styles.scrollView}>
                    { messages }
                </ScrollView>
            </Modal>

        );
    }
}

class Message extends Component {
    state = {
        descriptionActive: false,
    };

    toggleDescription = () => {
        this.setState({descriptionActive: !this.state.descriptionActive});
    };

    render () {
        return (
            <View>
                <TouchableHighlight onPress={this.toggleDescription}>
                    <View style={styles.scrollItemSmall}>
                        <Text
                            numberOfLines={3}
                            ellipsizeMode={'tail'}
                            style={styles.scrollItemTitle}>{this.props.title}
                        </Text>
                        <Text
                            style={styles.scrollItemDate}>{this.props.date}
                        </Text>
                    </View>

                </TouchableHighlight>
                {
                    this.state.descriptionActive ?
                        <View style={styles.scrollItemLarge}>
                            <Text style={styles.scrollItemDescription}>
                                {this.props.description + '\n\n'}
                                <Text style={styles.scrollItemOrg}>
                                    {this.props.org}
                                </Text>
                            </Text>
                        </View> : null
                }
            </View>


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
    scrollItemSmall: {
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
    scrollItemLarge: {
        backgroundColor: 'rgba(0,0,0,0.40)',
        borderBottomWidth: (1),
        borderBottomColor: 'rgba(80,80,80,.77)',
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 20,
        paddingRight: 20,
    },
    scrollItemTitle: {
        flex: 2,
        color: '#bfbfbf',
        fontSize: 18,
    },

    scrollItemDescription: {
        paddingLeft: 40,
        color: '#bfbfbf',
        fontSize: 15,
    },

    scrollItemOrg: {
        textAlign: 'right',
        color: '#bfbfbf',
        fontSize: 15,
    },

    scrollItemDate: {
        flex: 1,
        color: '#bfbfbf',
        fontSize: 18,
        textAlign: 'right',
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
