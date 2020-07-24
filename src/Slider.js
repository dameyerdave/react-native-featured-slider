import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Animated, Easing, PanResponder, Image } from 'react-native';

const TRACK_SIZE = 4
const THUMB_SIZE = 20
const TICK_SIZE = 4

const DEFAULT_ANIMATION_CONFIGS = {
  spring: {
    friction: 7,
    tension: 100,
  },
  timing: {
    duration: 150,
    easing: Easing.inOut(Easing.ease),
    delay: 0,
  },
};

const getBoundedValue = ({ value, maximumValue, minimumValue, revert }) => {
  value = revert ? minimumValue + maximumValue - value : value
  return value > maximumValue
    ? maximumValue
    : value < minimumValue
      ? minimumValue
      : value
}


class Rect {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  containsPoint(x, y) {
    return (
      x >= this.x &&
      y >= this.y &&
      x <= this.x + this.width &&
      y <= this.y + this.height
    );
  }
}

class Slider extends Component {
  constructor(props) {
    super(props);
    this.state = {
      containerSize: { width: 0, height: 0 },
      trackSize: { width: 0, height: 0 },
      thumbSize: { width: 0, height: 0 },
      allMeasured: false,
      value: new Animated.Value(getBoundedValue(props)),
    };

    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: this.handleStartShouldSetPanResponder.bind(
        this
      ),
      onMoveShouldSetPanResponder: this.handleMoveShouldSetPanResponder.bind(
        this
      ),
      onPanResponderGrant: this.handlePanResponderGrant.bind(this),
      onPanResponderMove: this.handlePanResponderMove.bind(this),
      onPanResponderRelease: this.handlePanResponderEnd.bind(this),
      onPanResponderTerminationRequest: this.handlePanResponderRequestEnd.bind(
        this
      ),
      onPanResponderTerminate: this.handlePanResponderEnd.bind(this),
    });
  }

  componentDidUpdate(prevProps) {
    const newValue = getBoundedValue(this.props);

    if (prevProps.value !== newValue) {
      if (this.props.animateTransitions) {
        this.setCurrentValueAnimated(newValue);
      } else {
        this.setCurrentValue(newValue);
      }
    }
  }

  setCurrentValue(value) {
    this.state.value.setValue(value);
  }

  setCurrentValueAnimated(value) {
    const { animationType } = this.props;
    const animationConfig = Object.assign(
      {},
      DEFAULT_ANIMATION_CONFIGS[animationType],
      this.props.animationConfig,
      {
        toValue: value,
      }
    );

    Animated[animationType](this.state.value, animationConfig).start();
  }

  handleMoveShouldSetPanResponder(/* e: Object, gestureState: Object */) {
    return false;
  }

  setValueFromPress({ nativeEvent }) {
    const { minimumValue, maximumValue } = this.props
    const { thumbSize, containerSize } = this.state
    let x = 0
    if (this.props.orientation === 'vertical') {
      x = nativeEvent.locationY - thumbSize.width / 2
    }
    else {
      x = nativeEvent.locationX - thumbSize.width / 2
    }
    const value = Math.round((maximumValue - minimumValue) / (containerSize.width - thumbSize.width) * x + minimumValue, 0)
    this.setCurrentValue(value)
    return value
  }

  handlePanResponderGrant(e) {
    this._previousLeft = this.getThumbLeft(this.setValueFromPress(e));
    this.fireChangeEvent('onSlidingStart');
    this.fireChangeEvent('onValueChange');
  }

  handlePanResponderMove(_, gestureState) {
    if (this.props.disabled) {
      return;
    }

    this.setCurrentValue(this.getValue(gestureState));
    this.fireChangeEvent('onValueChange');
  }

  handlePanResponderRequestEnd() {
    // Should we allow another component to take over this pan?
    return false;
  }

  handlePanResponderEnd(_, gestureState) {
    if (this.props.disabled) {
      return;
    }

    this.setCurrentValue(this.getValue(gestureState));
    this.fireChangeEvent('onSlidingComplete');
  }

  thumbHitTest({ nativeEvent }) {
    const thumbTouchRect = this.getThumbTouchRect();
    return thumbTouchRect.containsPoint(
      nativeEvent.locationX,
      nativeEvent.locationY
    );
  }

  handleStartShouldSetPanResponder(e) {
    return this.props.updateOnPress ? true : this.thumbHitTest(e);
  }

  fireChangeEvent(event) {
    const { maximumValue, minimumValue, revert } = this.props
    if (this.props[event]) {
      if (revert) {
        this.props[event](minimumValue + maximumValue - this.getCurrentValue());
      } else {
        this.props[event](this.getCurrentValue());
      }
    }
  }

  getTouchOverflowSize() {
    const { thumbSize, allMeasured, containerSize } = this.state;
    const { thumbTouchSize } = this.props;

    const size = {};
    if (allMeasured === true) {
      size.width = Math.max(0, thumbTouchSize.width - thumbSize.width);
      size.height = Math.max(0, thumbTouchSize.height - containerSize.height);
    }

    return size;
  }

  getTouchOverflowStyle() {
    const { width, height } = this.getTouchOverflowSize();

    const touchOverflowStyle = {};
    if (width !== undefined && height !== undefined) {
      const verticalMargin = -height / 2;
      touchOverflowStyle.marginTop = verticalMargin;
      touchOverflowStyle.marginBottom = verticalMargin;

      const horizontalMargin = -width / 2;
      touchOverflowStyle.marginLeft = horizontalMargin;
      touchOverflowStyle.marginRight = horizontalMargin;
    }

    if (this.props.debugTouchArea === true) {
      touchOverflowStyle.backgroundColor = 'orange';
      touchOverflowStyle.opacity = 0.5;
    }

    return touchOverflowStyle;
  }

  handleMeasure(name, x) {
    const { width: layoutWidth, height: layoutHeight } = x.nativeEvent.layout;
    const width =
      this.props.orientation === 'vertical' ? layoutHeight : layoutWidth;
    const height =
      this.props.orientation === 'vertical' ? layoutWidth : layoutHeight;
    const size = { width, height };
    const storeName = `_${name}`;
    const currentSize = this[storeName];
    if (
      currentSize &&
      width === currentSize.width &&
      height === currentSize.height
    ) {
      return;
    }
    this[storeName] = size;

    if (this._containerSize && this._trackSize && this._thumbSize) {
      this.setState({
        containerSize: this._containerSize,
        trackSize: this._trackSize,
        thumbSize: this._thumbSize,
        allMeasured: true,
      });
    }
  }

  measureContainer = (x) => {
    this.handleMeasure('containerSize', x);
  };

  measureTrack = (x) => {
    this.handleMeasure('trackSize', x, TRACK_SIZE / 2);
  };

  measureThumb = (x) => {
    this.handleMeasure('thumbSize', x);
  };

  getValue(gestureState) {
    const length = this.state.containerSize.width - this.state.thumbSize.width;
    const thumbLeft =
      this._previousLeft +
      (this.props.orientation === 'vertical'
        ? gestureState.dy
        : gestureState.dx);

    const ratio = thumbLeft / length;

    if (this.props.step) {
      return Math.max(
        this.props.minimumValue,
        Math.min(
          this.props.maximumValue,
          this.props.minimumValue +
          Math.round(
            (ratio * (this.props.maximumValue - this.props.minimumValue)) /
            this.props.step
          ) *
          this.props.step
        )
      );
    }
    return Math.max(
      this.props.minimumValue,
      Math.min(
        this.props.maximumValue,
        ratio * (this.props.maximumValue - this.props.minimumValue) +
        this.props.minimumValue
      )
    );
  }

  getCurrentValue() {
    return this.state.value.__getValue();
  }

  getRatio(value) {
    return (
      (value - this.props.minimumValue) /
      (this.props.maximumValue - this.props.minimumValue)
    );
  }

  getThumbLeft(value) {
    const ratio = this.getRatio(value);
    return (
      ratio * (this.state.containerSize.width - this.state.thumbSize.width)
    );
  }

  getThumbTouchRect() {
    const { thumbSize, containerSize } = this.state;
    const { thumbTouchSize } = this.props;
    const touchOverflowSize = this.getTouchOverflowSize();

    if (this.props.orientation === 'vertical') {
      return new Rect(
        touchOverflowSize.height / 2 +
        (containerSize.height - thumbTouchSize.height) / 2,
        touchOverflowSize.width / 2 +
        this.getThumbLeft(this.getCurrentValue()) +
        (thumbSize.width - thumbTouchSize.width) / 2,
        thumbTouchSize.width,
        thumbTouchSize.height
      );
    }
    return new Rect(
      touchOverflowSize.width / 2 +
      this.getThumbLeft(this.getCurrentValue()) +
      (thumbSize.width - thumbTouchSize.width) / 2,
      touchOverflowSize.height / 2 +
      (containerSize.height - thumbTouchSize.height) / 2,
      thumbTouchSize.width,
      thumbTouchSize.height
    );
  }

  renderDebugThumbTouchRect(thumbLeft) {
    const thumbTouchRect = this.getThumbTouchRect();
    const positionStyle = {
      left: thumbLeft,
      top: thumbTouchRect.y,
      width: thumbTouchRect.width,
      height: thumbTouchRect.height,
    };
    return <Animated.View style={positionStyle} pointerEvents="none" />;
  }

  getMinimumTrackStyles(thumbStart) {
    const { thumbOffset } = this.props
    const { thumbSize, trackSize } = this.state;
    const minimumTrackStyle = {
      position: 'absolute',
    };

    if (this.props.orientation === 'vertical') {
      minimumTrackStyle.height = Animated.add(thumbStart, (thumbOffset != 0 ? thumbSize.height / 2 : thumbSize.height));
      minimumTrackStyle.marginLeft = -trackSize.width;
    } else {
      minimumTrackStyle.width = Animated.add(thumbStart, (thumbOffset != 0 ? thumbSize.width / 2 : thumbSize.width));
      minimumTrackStyle.marginTop = -trackSize.height;
    }
    return minimumTrackStyle;
  }

  getHiddenTrackStyle(position) {
    const { backgroundColor } = this.props
    const { thumbSize, trackSize } = this.state;
    const hiddenTrackStyle = {
      position: 'absolute',
      zIndex: 4,
      backgroundColor: backgroundColor,
      borderRadius: 0,
    }
    if (position === 'start') {
      if (this.props.orientation === 'vertical') {
        hiddenTrackStyle.height = thumbSize.height / 2 - TICK_SIZE / 2
        hiddenTrackStyle.marginLeft = -trackSize.width;
      } else {
        hiddenTrackStyle.width = thumbSize.width / 2 - TICK_SIZE / 2
        hiddenTrackStyle.marginTop = -trackSize.height;
      }
    } else {
      if (this.props.orientation === 'vertical') {
        hiddenTrackStyle.top = trackSize.width - thumbSize.width / 2 + TICK_SIZE / 2
        hiddenTrackStyle.height = thumbSize.height / 2 - TICK_SIZE / 2
        hiddenTrackStyle.marginLeft = -trackSize.width;
      } else {
        hiddenTrackStyle.left = trackSize.width - thumbSize.width / 2 + TICK_SIZE / 2
        hiddenTrackStyle.width = thumbSize.width / 2 - TICK_SIZE / 2
        hiddenTrackStyle.marginTop = -trackSize.height;
      }
    }

    return hiddenTrackStyle
  }

  getThumbPositionStyles(thumbStart) {
    if (this.props.orientation === 'vertical') {
      return [
        {
          translateX:
            -(this.state.trackSize.height + this.state.thumbSize.height) / 2,
        },
        { translateY: thumbStart },
      ];
    }
    return [
      { translateX: thumbStart },
      {
        translateY:
          -(this.state.trackSize.height + this.state.thumbSize.height) / 2,
      },
    ];
  }

  getTickMarkPositions() {
    const { step, minimumValue, maximumValue, tickMarks } = this.props
    const { allMeasured, thumbSize, trackSize } = this.state

    let positions = []
    if (tickMarks && allMeasured) {
      const stepSize = (trackSize.width - thumbSize.width) / (maximumValue - minimumValue)
      if (step > 0) {
        positions.push(thumbSize.width / 2 - TICK_SIZE / 2)
        for (let i = 1; i <= maximumValue - minimumValue; i += step) {
          positions.push(stepSize * i + thumbSize.width / 2 - TICK_SIZE / 2)
        }
      }
    }
    return positions
  }

  render() {
    const {
      minimumValue,
      maximumValue,
      minimumTrackTintColor,
      maximumTrackTintColor,
      thumbTintColor,
      containerStyle,
      style,
      trackStyle,
      thumbStyle,
      debugTouchArea,
      orientation,
      tickMarks,
      tickMarksColor,
      backgroundImage,
      backgroundColor,
      revert,
      thumbOffset,
      ...other
    } = this.props;

    const { value, containerSize, thumbSize, allMeasured, trackSize } = this.state;

    const mainStyles = containerStyle || styles;
    const thumbStart = value.interpolate({
      inputRange: [minimumValue, maximumValue],
      outputRange: [0, containerSize.width - thumbSize.width],
      // extrapolate: 'clamp',
    });

    const valueVisibleStyle = {};
    if (!allMeasured) {
      valueVisibleStyle.height = 0;
      valueVisibleStyle.width = 0;
    }

    const minimumTrackStyle = {
      ...this.getMinimumTrackStyles(thumbStart),
      backgroundColor: revert ? maximumTrackTintColor : minimumTrackTintColor,
      ...valueVisibleStyle,
    };

    const tickMarkPositions = this.getTickMarkPositions()

    const thumbStyleTransform = (thumbStyle && thumbStyle.transform) || [];
    const touchOverflowStyle = this.getTouchOverflowStyle();
    return (
      <View
        {...other}
        style={StyleSheet.flatten([
          orientation === 'vertical'
            ? mainStyles.containerVertical
            : mainStyles.containerHorizontal,
          style,
        ])}
        onLayout={this.measureContainer}
      >
        <Image style={{ ...mainStyles.trackBackgroundImage, width: 40, height: trackSize.width - THUMB_SIZE }} resizeMode='stretch' source={backgroundImage} />
        <View
          style={StyleSheet.flatten([
            mainStyles.track,
            orientation === 'vertical'
              ? mainStyles.trackVertical
              : mainStyles.trackHorizontal,
            trackStyle,
            { backgroundColor: revert ? minimumTrackTintColor : maximumTrackTintColor },
          ])}
          onLayout={this.measureTrack}
        />
        <Animated.View
          style={StyleSheet.flatten([
            mainStyles.track,
            orientation === 'vertical'
              ? mainStyles.trackVertical
              : mainStyles.trackHorizontal,
            trackStyle,
            minimumTrackStyle,
          ])}
        />
        {
          backgroundImage && <View
            style={StyleSheet.flatten([
              mainStyles.track,
              orientation === 'vertical'
                ? mainStyles.trackVertical
                : mainStyles.trackHorizontal,
              trackStyle,
              this.getHiddenTrackStyle('start')
            ])}
          />
        }
        {
          backgroundImage && <View
            style={StyleSheet.flatten([
              mainStyles.track,
              orientation === 'vertical'
                ? mainStyles.trackVertical
                : mainStyles.trackHorizontal,
              trackStyle,
              this.getHiddenTrackStyle('end')
            ])}
          />
        }
        <Animated.View
          testID="sliderThumb"
          onLayout={this.measureThumb}
          style={StyleSheet.flatten([
            { backgroundColor: thumbTintColor },
            mainStyles.thumb,
            orientation === 'vertical'
              ? mainStyles.thumbVertical(trackStyle && trackStyle.width)
              : mainStyles.thumbHorizontal(trackStyle && trackStyle.height),
            thumbStyle,
            { marginLeft: thumbOffset },
            {
              transform: [
                ...this.getThumbPositionStyles(thumbStart),
                ...thumbStyleTransform,
              ],
              ...valueVisibleStyle,
            },
          ])}
        />
        <View
          style={StyleSheet.flatten([styles.touchArea, touchOverflowStyle])}
          {...this.panResponder.panHandlers}
        >
          {debugTouchArea === true &&
            this.renderDebugThumbTouchRect(thumbStart)}
        </View>
        {
          this.props.orientation === 'vertical' ?
            tickMarkPositions.map(position => <View key={position} style={{ ...styles.tick, backgroundColor: this.props.tickMarksColor, top: position }} />) :
            tickMarkPositions.map(position => <View key={position} style={{ ...styles.tick, backgroundColor: this.props.tickMarksColor, left: position }} />)
        }
      </View>
    );
  }
}

Slider.propTypes = {
  /**
   * Initial value of the slider. The value should be between minimumValue
   * and maximumValue, which default to 0 and 1 respectively.
   * Default value is 0.
   *
   * *This is not a controlled component*, e.g. if you don't update
   * the value, the component won't be reset to its inital value.
   */
  value: PropTypes.number,

  /**
   * If true the user won't be able to move the slider.
   * Default value is false.
   */
  disabled: PropTypes.bool,

  /**
   * Initial minimum value of the slider. Default value is 0.
   */
  minimumValue: PropTypes.number,

  /**
   * Initial maximum value of the slider. Default value is 1.
   */
  maximumValue: PropTypes.number,

  /**
   * Step value of the slider. The value should be between 0 and
   * (maximumValue - minimumValue). Default value is 0.
   */
  step: PropTypes.number,

  /**
   * The color used for the track to the left of the button. Overrides the
   * default blue gradient image.
   */
  minimumTrackTintColor: PropTypes.string,

  /**
   * The color used for the track to the right of the button. Overrides the
   * default blue gradient image.
   */
  maximumTrackTintColor: PropTypes.string,

  /**
   * The color used for the thumb.
   */
  thumbTintColor: PropTypes.string,

  /**
   * The size of the touch area that allows moving the thumb.
   * The touch area has the same center has the visible thumb.
   * This allows to have a visually small thumb while still allowing the user
   * to move it easily.
   * The default is {width: 40, height: 40}.
   */
  thumbTouchSize: PropTypes.shape({
    width: PropTypes.number,
    height: PropTypes.number,
  }),

  /**
   * Callback continuously called while the user is dragging the slider.
   */
  onValueChange: PropTypes.func,

  /**
   * Callback called when the user starts changing the value (e.g. when
   * the slider is pressed).
   */
  onSlidingStart: PropTypes.func,

  /**
   * Callback called when the user finishes changing the value (e.g. when
   * the slider is released).
   */
  onSlidingComplete: PropTypes.func,

  /**
   * The style applied to the slider container.
   */
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),

  /**
   * The style applied to the track.
   */
  trackStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),

  /**
   * The style applied to the thumb.
   */
  thumbStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),

  /**
   * Set this to true to visually see the thumb touch rect in green.
   */
  debugTouchArea: PropTypes.bool,

  /**
   * Set to true to animate values with default 'timing' animation type
   */
  animateTransitions: PropTypes.bool,

  /**
   * Custom Animation type. 'spring' or 'timing'.
   */
  animationType: PropTypes.oneOf(['spring', 'timing']),

  /**
   * Choose the orientation. 'horizontal' or 'vertical'.
   */
  orientation: PropTypes.oneOf(['horizontal', 'vertical']),

  /**
   * Used to configure the animation parameters.  These are the same parameters in the Animated library.
   */
  animationConfig: PropTypes.object,
  containerStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),

  /**
   *  Show tickMarks
   */
  tickMarks: PropTypes.bool,

  /**
   * Color of the tickMarks
   */
  tickMarksColor: PropTypes.string,

  /**
   * The background image
   */
  backgroundImage: PropTypes.any,

  /**
   * To revert the slider
   */
  revert: PropTypes.bool,

  /**
   * To allow updates on press (not just on slide)
   */
  updateOnPress: PropTypes.bool,

  /** 
   * The background color of the slider (useful if using with background image)
   */
  backgroundColor: PropTypes.string,

  /**
   * The offset of the thumb
   */
  thumbOffset: PropTypes.number
};

Slider.defaultProps = {
  value: 0,
  minimumValue: 0,
  maximumValue: 1,
  step: 0,
  minimumTrackTintColor: '#3f3f3f',
  maximumTrackTintColor: '#b3b3b3',
  thumbTintColor: 'red',
  thumbTouchSize: { width: 40, height: 40 },
  debugTouchArea: false,
  animationType: 'timing',
  orientation: 'horizontal',
  tickMarks: false,
  tickMarksColor: '#000',
  backgroundImage: null,
  revert: false,
  updateOnPress: true,
  backgroundColor: '#fff',
  thumbOffset: 0
};

const styles = StyleSheet.create({
  containerHorizontal: {
    height: 40,
    justifyContent: 'center',
  },
  containerVertical: {
    width: 40,
    flexDirection: 'column',
    alignItems: 'center',
  },
  track: {
    //position: 'absolute',
    zIndex: 2,
    borderRadius: TRACK_SIZE / 2,
  },
  trackHorizontal: {
    height: TRACK_SIZE,
    marginHorizontal: THUMB_SIZE / 2,
  },
  trackVertical: {
    flex: 1,
    width: TRACK_SIZE,
    // marginVertical: THUMB_SIZE / 2,
  },
  trackBackgroundImage: {
    position: 'absolute',
    zIndex: 1,
    // marginVertical: THUMB_SIZE / 2
  },
  thumb: {
    position: 'absolute',
    zIndex: 5,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
  },
  tick: {
    position: 'absolute',
    zIndex: 3,
    width: TICK_SIZE,
    height: TICK_SIZE,
    borderRadius: TICK_SIZE / 2,
  },
  thumbHorizontal: (height) => ({
    top: 22 + (height ? (height - 4) / 2 : 0),
  }),
  thumbVertical: (width) => ({
    left: 22 + (width ? (width - 4) / 2 : 0),
  }),
  touchArea: {
    position: 'absolute',
    zIndex: 6,
    backgroundColor: 'transparent',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  debugThumbTouchArea: {
    position: 'absolute',
    backgroundColor: 'green',
    opacity: 0.5,
  },
});

export { Slider };