import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Slider } from './src/Slider'

export default function App() {
  const [level, setLevel] = useState(2)

  return (
    <View style={styles.container}>
      <Text>{level}</Text>
      <Slider orientation='vertical' revert={true} backgroundImage={require('./assets/color_scale_large.png')} style={{borderWidth: 0}} debugTouchArea={false} step={1} minimumValue={1} maximumValue={10} minimumTrackTintColor="#ff0000" onValueChange={value => setLevel(value)} value={level} thumbStyle={{backgroundColor: 'rgba(0,0,0,0.5)'}}/>
      <StatusBar hidden={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    alignItems: 'stretch',
    justifyContent: 'center',
    marginVertical: 20
  },
});
