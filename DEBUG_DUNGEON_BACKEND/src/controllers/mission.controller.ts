import { Request, Response } from "express";
import {
  completeMissionAttempt,
  getMissionPerformanceForUser,
  getMissionForUser,
  getMissionProgressForUser,
  restartMissionForUser,
  startMissionForUser,
  submitAnswerForAttempt,
} from "../services/mission.service.js";
import type {
  AnswerSubmissionBody,
  AnswerSubmissionParams,
  MissionCompletionParams,
  MissionParams,
} from "../validations/mission.validation.js";

export const startMission = async (
  req: Request<{ missionId: string }>,
  res: Response,
) => {
  const result = await startMissionForUser(
    req.user.userId,
    req.params.missionId,
  );

  if (!result) {
    return res.status(404).json({
      message: "Mission not found",
    });
  }

  return res.status(result.resumed ? 200 : 201).json(result);
};

export const getMission = async (
  req: Request<{ missionId: string }>,
  res: Response,
) => {
  const mission = await getMissionForUser(req.params.missionId);

  if (!mission) {
    return res.status(404).json({ message: "Mission not found" });
  }

  return res.status(200).json(mission);
};

export const restartMission = async (
  req: Request<{ missionId: string }>,
  res: Response,
) => {
  const result = await restartMissionForUser(
    req.user.userId,
    req.params.missionId,
  );

  if (!result) {
    return res.status(404).json({
      message: "Mission not found",
    });
  }

  return res.status(201).json(result);
};

export const submitAnswer = async (
  req: Request<AnswerSubmissionParams, unknown, AnswerSubmissionBody>,
  res: Response,
) => {
  const result = await submitAnswerForAttempt({
    userId: req.user.userId,
    missionId: req.params.missionId,
    attemptId: req.params.attemptId,
    questionId: req.params.questionId,
    selectedOptionId: req.body.selectedOptionId,
  });

  if (result.ok) {
    return res.status(201).json(result.answer);
  }

  switch (result.code) {
    case "ATTEMPT_NOT_FOUND":
      return res.status(404).json({ message: "Mission attempt not found" });
    case "ATTEMPT_FORBIDDEN":
      return res.status(403).json({
        message: "Mission attempt does not belong to this user",
      });
    case "ATTEMPT_MISSION_MISMATCH":
      return res.status(404).json({
        message: "Mission attempt does not belong to this mission",
      });
    case "ATTEMPT_NOT_IN_PROGRESS":
      return res.status(409).json({
        message: "Mission attempt is not in progress",
      });
    case "QUESTION_NOT_FOUND":
      return res.status(404).json({ message: "Question not found" });
    case "QUESTION_MISSION_MISMATCH":
      return res.status(400).json({
        message: "Question does not belong to this mission",
      });
    case "OPTION_NOT_FOUND":
      return res.status(404).json({ message: "Option not found" });
    case "OPTION_QUESTION_MISMATCH":
      return res.status(400).json({
        message: "Option does not belong to this question",
      });
    case "DUPLICATE_ANSWER":
      return res.status(409).json({
        message: "Question has already been answered in this attempt",
      });
  }
};

export const completeMission = async (
  req: Request<MissionCompletionParams>,
  res: Response,
) => {
  const result = await completeMissionAttempt({
    userId: req.user.userId,
    missionId: req.params.missionId,
    attemptId: req.params.attemptId,
  });

  if (result.ok) {
    return res.status(200).json(result.completion);
  }

  switch (result.code) {
    case "ATTEMPT_NOT_FOUND":
      return res.status(404).json({ message: "Mission attempt not found" });
    case "ATTEMPT_FORBIDDEN":
      return res.status(403).json({
        message: "Mission attempt does not belong to this user",
      });
    case "ATTEMPT_MISSION_MISMATCH":
      return res.status(404).json({
        message: "Mission attempt does not belong to this mission",
      });
    case "ATTEMPT_NOT_IN_PROGRESS":
      return res.status(409).json({
        message: "Mission attempt is not in progress",
      });
  }
};

export const getMissionProgress = async (
  req: Request<MissionParams>,
  res: Response,
) => {
  const result = await getMissionProgressForUser(
    req.user.userId,
    req.params.missionId,
  );

  if (result.ok) {
    return res.status(200).json(result.progress);
  }

  if (result.code === "MISSION_NOT_FOUND") {
    return res.status(404).json({ message: "Mission not found" });
  }

  return res.status(404).json({ message: "Mission progress not found" });
};

export const getMissionPerformance = async (
  req: Request<MissionParams>,
  res: Response,
) => {
  const result = await getMissionPerformanceForUser(
    req.user.userId,
    req.params.missionId,
  );

  if (result.ok) {
    return res.status(200).json(result.performance);
  }

  if (result.code === "MISSION_NOT_FOUND") {
    return res.status(404).json({ message: "Mission not found" });
  }

  return res.status(404).json({ message: "Mission progress not found" });
};
