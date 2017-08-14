/**
 * Created by jhank on 4/12/2017.
 */
import React, { Component } from 'react';
import {
    Slider,
    StyleSheet,
    Text,
    View,

} from 'react-native';


export class SeveritySlider extends Component {
    state = {
        value: this.props.value,
    };

    render() {
        return (
            <View>
                <Text style={styles.subheader1}>{this.props.displayText}</Text>
                <Slider
                    style = {styles.severitySlider}
                    minimumValue={0}
                    maximumValue={5}
                    step={1}
                    onValueChange={(value) => this.setState({value: value})}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    severitySlider: {
        height: 25,
    },
    subheader1: {
        fontSize: 22,
    },
});