import React, { Component } from 'react';
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    View,
} from 'react-native';

/*
 * Modal to be displayed while Synapse platform is syncing with the backend.
 */
export class SyncModal extends Component {
    render() {
        return (
            <View>
                <Modal
                    animationType={"fade"}
                    transparent={true}
                    visible={this.props.modalVisible}
                    onRequestClose={() => {}}
                >
                    <View style={syncModalStyles.syncModal}>
                        <View style={syncModalStyles.syncModalContent}>
                            <Text style={{textAlign: 'center'}}>Syncing with the Synapse platform...</Text>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }
}

const syncModalStyles = StyleSheet.create({
    syncModal: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        justifyContent: 'space-between',
        paddingTop: Dimensions.get('window').height / 3,
        paddingLeft: Dimensions.get('window').width / 16,
        paddingRight: Dimensions.get('window').width / 16,
        backgroundColor: 'rgba(0,0,0,.6)',
    },

    syncModalContent: {
        flexDirection: 'column',
        borderRadius: 20,
        backgroundColor: '#fff',
        padding: 20,
    },
});
