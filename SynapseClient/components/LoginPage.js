import React, { Component } from 'react';
import {
    Image,
    Text,
    View,
    Navigator,
    Dimensions,
    AsyncStorage,
} from 'react-native';

export class LoginPage extends Component {
    componentWillMount() {
        var navigator = this.props.navigator;
        var doIntroSequence = this.props.doIntroSequence;
        console.log("In Login page, introSequence == " + doIntroSequence);
        setTimeout(() => {
                AsyncStorage.getItem('introSequence').then((value) => {
                    if (value !== null){
                        navigator.replace({
                            id: 'App',
                        });
                      } else {
                        AsyncStorage.setItem('introSequence', 'true');
                        navigator.replace({
                            id: 'IntroSequence',
                        });
                      }
              }).done();
        }, 2000);
    }

    render () {
        return (
            <View style={{flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center'}}>
                <Image style={{width:Dimensions.get('window').width, resizeMode:'contain'}} source={require('../images/synapselogo.png')}></Image>
            </View>
        );
    }
}

