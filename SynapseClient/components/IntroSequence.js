import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
const windowsWidth = Dimensions.get('window').width;
const windowsHeight = Dimensions.get('window').height;
import AppIntro from 'react-native-app-intro';

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#9DD6EB',
    padding: 15,
  },
  header: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center'
  },
  info: {
    flex: 0.5,
    alignItems: 'center',
    padding: 40
  },
  title: {
    color: '#fff',
    fontSize: 30,
    paddingBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center'
  },
  description: {
    color: '#fff',
    fontSize: 20,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center'
  },
  title_black: {
    color: 'black',
    fontSize: 30,
    paddingBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center'
  },
  description_black: {
    color: 'black',
    fontSize: 20,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center'
  },
});

export class IntroSequence extends Component {

  onSkipBtnHandle = (index) => {
  	var navigator = this.props.navigator;
    navigator.replace({
      id: 'App',
    });
    console.log(index);
  }
  doneBtnHandle = () => {
    Alert.alert('Welcome to Synapse!');
    var navigator = this.props.navigator;
    navigator.replace({
      id: 'App',
    });
  }
  nextBtnHandle = (index) => {
    console.log(index);
  }
  onSlideChangeHandle = (index, total) => {
    console.log(index, total);
  }

  render() {
    return (
      <AppIntro
        onNextBtnClick={this.nextBtnHandle}
        onDoneBtnClick={this.doneBtnHandle}
        onSkipBtnClick={this.onSkipBtnHandle}
        onSlideChange={this.onSlideChangeHandle}
        dotColor='rgba(0,0,0,0.3)'
        activeDotColor = 'black'
        leftTextColor = 'black'
        rightTextColor = 'black'
      >
      <View style={[styles.slide, { backgroundColor: 'white' }]}>
        <View style={[styles.header, {width: windowsWidth}]}>
	        <View style={{
	            flex:1,
	            alignItems: 'center',
	            justifyContent: 'center',
	            padding: 10,
	            width: windowsWidth,
	            height: windowsHeight,
	          }} level={20}
	          >
            	<Image style={{ width: windowsWidth, height: windowsHeight/4 }} source={require('../images/synapse_black.png')} />
          	</View>
        </View>
        <View style={styles.info}>
          <View level={10}><Text style={styles.title_black}>Welcome!</Text></View>
          <View level={15}><Text style={styles.description_black}>Swipe to the right for a quick tutorial.</Text></View>
        </View>
      </View>
      <View style={[styles.slide, { backgroundColor: '#406E9F' }]}>
        <View style={[styles.header, {width: windowsWidth}]}>
	        <View style={{
	            flex:1,
	            alignItems: 'center',
	            justifyContent: 'center',
	            padding: 10,
	            width: windowsWidth,
	            height: windowsHeight,
	          }} level={20}
	          >
            	<Image style={{ width: windowsWidth/2.5, height: windowsHeight/2.5 }} source={require('../images/refresh-result.png')} />
          	</View>
        </View>
        <View style={styles.info}>
          <View level={10}><Text style={styles.title}>Map Refresh</Text></View>
          <View level={15}><Text style={styles.description}>Pushing the refresh button will download all recent reports in your area.</Text></View>
        </View>
      </View>

      <View style={[styles.slide, { backgroundColor: '#fa931d' }]}>
        <View style={[styles.header, {width: windowsWidth}]}>
	        <View style={{
	            position: 'absolute',
	            top: 0,
	            left: 10,
	            width: windowsWidth,
	            height: windowsHeight,
	          }} level={20}
	          >
            	<Image style={{ width: windowsWidth/2.5, height: windowsHeight/2.5 }} source={require('../images/intro-pin-button.png')} />
          	</View>

          	<View style={{
	            position: 'absolute',
	            top: 0,
	            left: windowsWidth/3.75,
	            width: windowsWidth,
	            height: windowsHeight,
	          }} level={20}
	          >
            	<Image style={{ width: windowsWidth/2.5, height: windowsHeight/2.5 }} source={require('../images/allpins.png')} />
          	</View>
        </View>
        <View style={styles.info}>
          <View level={10}><Text style={styles.title}>Create Reports</Text></View>
          <View level={15}><Text style={styles.description}>Help share information about your surroundings by dropping pins. Currently you can make reports about road blocks, power outages, and water, food, medical aid, and fuel stations.</Text></View>
        </View>
      </View>

      <View style={[styles.slide, { backgroundColor: '#406E9F' }]}>
        <View style={[styles.header, {width: windowsWidth}]}>
	        <View style={{
	            flex:1,
	            alignItems: 'center',
	            justifyContent: 'center',
	            padding: 10,
	            width: windowsWidth,
	            height: windowsHeight,
	          }} level={20}
	          >
            	<Image style={{ width: windowsWidth/2.5, height: windowsHeight/2.5 }} source={require('../images/event-info.png')} />
          	</View>
        </View>
        <View style={styles.info}>
          <View level={10}><Text style={styles.title}>View Reports</Text></View>
          <View level={15}><Text style={styles.description}>View reports other users have made by clicking on a pin. You can see helpful information about the event and a trustworthiness score in the top right corner.</Text></View>
        </View>
      </View>

      <View style={[styles.slide, { backgroundColor: '#a4b602' }]}>
        <View style={[styles.header, {width: windowsWidth}]}>
	        <View style={{
	            position: 'absolute',
	            top: 0,
	            left: 10,
	            width: windowsWidth,
	            height: windowsHeight,
	          }} level={20}
	          >
            	<Image style={{ width: windowsWidth/2.5, height: windowsHeight/2.5 }} source={require('../images/cache-button.png')} />
          	</View>

          	<View style={{
	            position: 'absolute',
	            top: 0,
	            left: windowsWidth/3.75,
	            width: windowsWidth,
	            height: windowsHeight,
	          }} level={20}
	          >
            	<Image style={{ width: windowsWidth/2.5, height: windowsHeight/2.5 }} source={require('../images/city-cache.png')} />
          	</View>
        </View>
        <View style={styles.info}>
          <View level={10}><Text style={styles.title}>Save Map Tiles</Text></View>
          <View level={15}><Text style={styles.description}>You can also save map tiles just in case you lose network connection after a disaster!</Text></View>
        </View>
      </View>

      <View style={[styles.slide, { backgroundColor: 'white' }]}>
        <View style={[styles.header, {width: windowsWidth}]}>
	        <View style={{
	            flex:1,
	            alignItems: 'center',
	            justifyContent: 'center',
	            padding: 10,
	            width: windowsWidth,
	            height: windowsHeight,
	          }} level={20}
	          >
            	<Image style={{ width: windowsWidth, height: windowsHeight/4 }} source={require('../images/synapse_black.png')} />
          	</View>
        </View>
        <View style={styles.info}>
        <View level={10}><Text style={styles.title_black}>Congratulations!</Text></View>
          <View level={15}><Text style={styles.description_black}>With Synapse on your phone, you can stay connected to information after a natural disaster!</Text></View>
        </View>
      </View>
      </AppIntro>
    );
  }
}

