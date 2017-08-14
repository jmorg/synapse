/**
 * Created by jhank on 4/13/2017.
 */

import React, { Component } from 'react';
import {
    Image,
    TouchableHighlight,

} from 'react-native';

export class ImageButton extends Component {
    render() {
        return(
            <TouchableHighlight
                style = {[this.props.imageStyle, {borderRadius: 500}]}
                onPress={this.props.onPress}
                underlayColor={'black'}
                activeOpacity={0.60}
            >
                <Image source={ // Yes, this is not beautiful, but paths MUST be static, and this should not affect throughput
                    this.props.imageName === 'center' ? require('../images/centerbutton.png') :
                    this.props.imageName === 'pin' ? require('../images/pinbutton.png') :
                    this.props.imageName === 'refresh' ? require('../images/refreshbutton.png') :
                    this.props.imageName === 'check' ? require('../images/checkbutton.png') :
                    this.props.imageName === 'Gas' ? require('../images/gas.png') :
                    this.props.imageName === 'Water' ? require('../images/water.png') :
                    this.props.imageName === 'Roadblock' ? require('../images/roadblock.png') :
                    this.props.imageName === 'Hospital' ? require('../images/hospital.png') :
                    this.props.imageName === 'Food' ? require('../images/food.png') :
                    this.props.imageName === 'Power Outage' ? require('../images/nopower.png') :
                    this.props.imageName === 'verify' ? require("../images/Verify.png") :
                    this.props.imageName === 'dispute' ? require("../images/Dispute.png") :
                    this.props.imageName === 'verifyGray' ? require("../images/VerifyGray.png") :
                    this.props.imageName === 'disputeGray' ? require("../images/DisputeGray.png") :
                    this.props.imageName === 'settings' ? require("../images/settings.png") :
                    this.props.imageName === 'grayX' ? require("../images/lightGrayX.png") :
                    this.props.imageName === 'back' ? require("../images/backarrow.png") :
                    this.props.imageName === 'download' ? require("../images/download.png") :
                    this.props.imageName === 'nextpage' ? require("../images/feedforward.png") :
                    this.props.imageName === 'lastpage' ? require("../images/feedbackwards.png") :
                    this.props.imageName === 'login' ? require("../images/login.png") :
                    require("../images/xbutton.png")}
                       style={[this.props.imageStyle, {margin: 0}]}/>
            </TouchableHighlight>
        );
    }
}
