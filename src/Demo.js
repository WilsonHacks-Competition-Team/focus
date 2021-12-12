import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-converter";
import "@tensorflow/tfjs-backend-webgl";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { draw } from "./mask";
import { getDistance, getAngle, overallXAngle, overallYAngle, averageAngles } from "./analyzePoints";
import { IconPanoramaVertical } from "@aws-amplify/ui-react";

const Demo = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [frames, setFrames] = useState(0);
  const [tog, setTog] = useState(false);
  const [first, setFirst] = useState(true);
  const [done, setDone] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [model, setModel] = useState(null);

  const [dist, setDist] = useState(0);
  const [xAngle, setXAngle] = useState(0);
  const [yAngle, setYAngle] = useState(0);
  const [overallAngle, setOverallAngle] = useState(0);
  const [angleMeasures, setAngleMeasures] = useState([])

  const loop = true;
  const consoleOuput = false;

  const runPredict = async () => {
    if (consoleOuput) {
      console.log("loading model");
    }
    setModel(
      await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh
      )
    );
    setLoaded(true);
    detect(model);
  };
  const detect = async (model) => {
    const t0 = new Date().getTime();
    if (videoRef.current) {
      const webcamCurrent = videoRef.current;
      const videoWidth = webcamCurrent.video.videoWidth;
      const videoHeight = webcamCurrent.video.videoHeight;
      // go next step only when the video is completely uploaded.
      if (webcamCurrent.video.readyState === 4) {
        if (first) {
          setFirst(false);
          canvasRef.current.width = videoWidth;
          canvasRef.current.height = videoHeight;
        }
        const video = webcamCurrent.video;
        const predictions = await model.estimateFaces({
          input: video,
        });
        if (predictions.length) {
          if (consoleOuput) {
            console.log(predictions);
          }
          if (!loop) {
            setDone(true);
          }
          const ctx = canvasRef.current.getContext("2d");
          requestAnimationFrame(() => {
            if (consoleOuput) {
              console.log("drawing");
            }
            draw(predictions, ctx, videoWidth, videoHeight);
            setDist(getDistance(predictions));
            const { xAngle, yAngle } = getAngle(predictions);
            setXAngle(xAngle);
            setYAngle(yAngle);
            setAngleMeasures(prev => {
                const msrs = [...prev]
                if (msrs.length >= 10) {
                    msrs.splice(0, 1)
                }
                msrs.push({x: overallXAngle(predictions), y: overallYAngle(predictions)})
                setOverallAngle(averageAngles(msrs));
                return msrs
            })
            
          });

          const t1 = new Date().getTime();
          setFrames(1 / ((t1 - t0) / 1000));
          //detect(model)
        }
      }
    }
    setTog(!tog);
  };
  useEffect(() => {
    if (!done) {
      if (model === null) {
        runPredict();
      } else {
        detect(model);
      }
    }
  }, [videoRef, tog]);

  return (
    <div
      style={{ backgroundColor: Math.abs(overallAngle.x) > 25 || Math.abs(overallAngle.y) > 25 ? "red" : "white" }}
    >
      <Webcam id="video" ref={videoRef}></Webcam>
      <canvas ref={canvasRef} />
      <p>Frames: {frames}</p>
      <p>Distance: {dist}</p>
      <p>X Angle: {xAngle}</p>
      <p>Y Angle: {yAngle}</p>
      <p>Overall Angle: {overallAngle.x} {overallAngle.y}</p>
      <div
        style={{
          position: "fixed",
          top: ((overallAngle.y-20)/-40)*1080,
          left: ((overallAngle.x - 20) / -40) * 1920,
          height: 50,
          width: 50,
          backgroundColor: "blue",
        }}
      />
    </div>
  );
};

export default Demo;
