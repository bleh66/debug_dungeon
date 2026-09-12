import { Request, Response, NextFunction } from "express";
import {ZodType} from "zod";

type ValidationTarget = "body" | "params";

export const validate=(schema:ZodType, target: ValidationTarget = "body")=>{
    return (req:Request,res:Response,next:NextFunction)=>{
        const result = schema.safeParse(req[target]);

        if(!result.success){
            return res.status(400).json({
                message: "Validation failed",
                errors: result.error.issues
            })
        }

        if (target === "body") {
            req.body = result.data;
        } else {
            req.params = result.data as Request["params"];
        }

        next();

    }
}
