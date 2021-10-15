import { Users } from "../models/user.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import express from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

const router = express.Router();
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "prabapkv007@gmail.com",
    pass: "112233Pk",
  },
});

// get users
router
  .route("/users")
  .get(async (request, response) => {
    try {
      const usersList = await Users.find();
      response.json(usersList);
      console.log(usersList);
    } catch (err) {
      response.send(err);
      console.log(err);
    }
  })

  //delete users
  .delete(async (request, response) => {
    const { id } = request.body;
    try {
      const findUser = await Users.findById({ _id: id });
      findUser.remove();
      response.send({ findUser, message: "Deleted" });
    } catch (err) {
      console.log(err);
    }
  })

  // update users
  .patch(async (request, response) => {
    const { id, firstName, lastName, email, mobileNo } = request.body;
    try {
      const findUser = await Users.findById({ _id: id });

      if (firstName) {
        findUser.firstName = firstName;
      }
      if (lastName) {
        findUser.lastName = lastName;
      }
      if (email) {
        findUser.email = email;
      }
      if (mobileNo) {
        findUser.mobileNo = mobileNo;
      }
      await findUser.save();
      response.send({ findUser, message: "Updated" });
    } catch (err) {
      console.log(err);
    }
  });

// signup

router.route("/signup").post(async (request, response) => {
  const { firstName, lastName, email, password, mobileNo } = request.body;
  const findDuplicate = await Users.findOne({ email: email });
  if (findDuplicate) {
    response.status(409);
    response.send("Email already exists!");
  } else {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const newUser = new Users({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        mobileNo,
      });
      await newUser.save();

      const token = jwt.sign({ id: newUser._id }, "MySecretKey", {
        expiresIn: "1 day",
      });
      console.log("token-->", token);
      console.log(newUser);
      let mail = await transporter.sendMail({
        from: "prabapkv007@gmail.com",
        to: `${newUser.email}`,
        subject: " signup confirmation Mail",
        html: `<h1>Hi ${newUser.firstName} ${newUser.lastName},</h1><br/><h2>Welcome to PK Insitute</h2><p>
                  <a href ="https://password-reset-back.herokuapp.com/verify?token=${token}">Click to Activate your Account</a>`,
      });
      console.log("mail is", mail);
      if (mail.accepted.length > 0) {
        await response.send({
          newUser,
          message:
            "Registration Success.kindly check your mail to activate your account! ",
        });
      } else if (mail.rejected.length == 1) {
        await response.send({ message: "Registration failed" });
      }
    } catch (err) {
      console.log(err);
    }
  }
});

// verify signup
router.route("/verify").get(async (request, response) => {
  try {
    const token = request.query.token;
    if (token) {
      const { id } = jwt.verify(token, "MySecretKey");
      await Users.updateOne({ _id: id }, { confirm: true });
      response.send("Your Account is Activated");
      response.redirect(`https://gallant-visvesvaraya-d2af78.netlify.app/`);
    } else {
      response.status(401).json({ message: "Invalid Token" });
    }
  } catch (err) {
    response.status(500).send("Server Error");
  }
});

//login
router.route("/login").post(async (request, response) => {
  const { email, password } = request.body;
  try {
    const findUser = await Users.findOne({ email: email });

    if (!findUser) {
      return response.status(401).send({ message: "Invalid credentials!" });
    } else if (
      findUser &&
      (await bcrypt.compare(password, findUser.password))
    ) {
      const genToken = jwt.sign({ id: findUser._id }, "secretKey");
      response.cookie("jwtToken", genToken, {
        sameSite: "strict",
        expires: new Date(new Date().getTime() + 3600 * 1000),
        httpOnly: true,
      });
      return response.status(200).json({ message: "Logged in succuessfully" });
    } else {
      return response.status(401).send({ message: "Invalid credentials" });
    }
  } catch (err) {
    response.status(500).send(err);
    console.log(err);
  }
});

// forgot password
router.route("/forgot-password").post(async (request, response) => {
  const { email } = request.body;
  try {
    const user = await Users.findOne({ email: email });

    crypto.randomBytes(32, async (err, buffer) => {
      if (err) {
        console.log(err);
        return response.status(500).send({ message: "Cant generate token" });
      }
      const token = buffer.toString("hex");
      if (!user) {
        response.send({
          message: `No user Found for this email ${email} Kindly Register and then try again`,
        });
      }
      user.resetToken = token;
      user.expiryTime = Date.now() + 3600000;
      await user.save();
      console.log("mail is going to be sent");
      let ForgotMail = await transporter.sendMail({
        from: "prabapkv007@gmail.com",
        to: `${user.email}`,
        subject: "Password reset",
        html: `<h4>Your request for password reset has been accepted</h4><br/><p> To reset your password,
        <a href="https://gallant-visvesvaraya-d2af78.netlify.app/reset-password/${token}">click here </a>, `,
      });
      console.log("Forgotmail is", ForgotMail);
      if (ForgotMail.accepted.length > 0) {
        await response.send({
          message: "Mail Sent for Forgot Password",
        });
        console.log(user);
      } else if (ForgotMail.rejected.length == 1) {
        await response.send({ message: "Errors" });
      }
    });
  } catch (err) {
    console.log(err);
  }
});

//reset password
router.route("/reset-password").post(async (request, response) => {
  const { resetToken, newPassword } = request.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const newhashedPassword = await bcrypt.hash(newPassword, salt);
    const usersList = await Users.findOne({
      resetToken: resetToken,
    });
    console.log("found User by Token", usersList);
    if (usersList) {
      usersList.password = newhashedPassword;
      usersList.resetToken = undefined;
      usersList.expiryTime = undefined;
      await usersList.save();
    }
    console.log("updated User by Token", usersList);
    response.send({ message: "passwaord changed successfully", usersList });
    response.redirect("https://gallant-visvesvaraya-d2af78.netlify.app/login");
  } catch (err) {
    response.send(err);
    console.log(err);
  }
});

export const userRouter = router;
