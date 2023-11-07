import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import { checkAccessToken } from "../middleware/authMiddleware.js";
import { initializeApp } from "firebase/app";
import {
  getStorage,
  ref,
  getDownloadURL,
  uploadBytesResumable,
} from "firebase/storage";
import config from "../config/firebase.js";
import multer from "multer";
import Admin from "../models/admin.js";
import User from "../models/userModel.js";
import Movies from "../models/movies.js";
import Voucher from "../models/voucher.js";

initializeApp(config.firebaseConfig);
const storage = getStorage();
const upload = multer({ storage: multer.memoryStorage() });

const adminRouter = express.Router();

adminRouter.post("/login-admin", async (req, res) => {
  const { email, password } = req.body;

  try {
      const user = await Admin.findOne({ email });
      console.log(user,email,password);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const isPasswordValid = await bcrypt.compare(password, '987longvu123');
    if (password === "987longvu123") {
      const token = jwt.sign({ id: user._id }, "VinalinkGroup!2020", {
        expiresIn: "30d",
      });
      const refreshToken = jwt.sign({ id: user._id }, "YourRefreshSecretKey", {
        expiresIn: "7d",
      });
      res.status(200).json({ token, refreshToken, role: "user" });
    } else {
      res.status(401).json({ message: "Invalid password." });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
adminRouter.post("/refresh-token", (req, res) => {
  const { refreshToken } = req.body;

  try {
    const decoded = jwt.verify(refreshToken, "YourRefreshSecretKey");
    const accessToken = jwt.sign({ id: decoded.id }, "VinalinkGroup!2020", {
      expiresIn: "1h",
    });

    res.status(200).json({ accessToken });
  } catch (error) {
    res.status(401).json({ message: "Invalid Refresh Token." });
  }
});
const transporter = nodemailer.createTransport({
  service: "Gmail", // Hoặc sử dụng các dịch vụ khác như SendGrid, Mailgun, ...
  auth: {
    user: "do.not.reply.0612@gmail.com", // Điền email của bạn ở đây
    pass: "lqdyfeilteovnofn", // Điền mật khẩu email của bạn ở đây
  },
});

// Route để xử lý yêu cầu quên mật khẩu và gửi email xác nhận
adminRouter.post("/reset-password", async (req, res) => {
  const { email, confirmationCode, newPassword } = req.body;

  try {
    // Tìm người dùng với email và mã reset password khớp
    const user = await Admin.findOne({ email, confirmationCode });
    if (!user) {
      return res.status(404).json({ message: "Invalid reset code." });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu của người dùng với mật khẩu mới
    user.password = hashedPassword;
    // Xóa mã reset password để nó không thể được sử dụng lại
    user.confirmationCode = null;
    await user.save();

    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
adminRouter.put(
  "/change-profile",
  checkAccessToken,
  upload.single("avatar"),
  async (req, res) => {
    const { username, userInfo } = req.body;
    try {
      const userId = req.user.id;
      const updatedUserData = {};

      // Kiểm tra xem người dùng đã tải lên hình ảnh avatar hay chưa
      if (req.file) {
        const user = await Admin.findById(userId);
        const storageRef = ref(
          storage,
          `user-info/${user.email}/${req.file.originalname}`
        );
        const metadata = {
          contentType: req.file.mimetype,
        };
        const snapshot = await uploadBytesResumable(
          storageRef,
          req.file.buffer,
          metadata
        );
        //by using uploadBytesResumable we can control the progress of uploading like pause, resume, cancel

        // Grab the public URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        updatedUserData.avatar = downloadURL;
      }

      // Kiểm tra xem người dùng đã cung cấp tên người dùng mới hay chưa
      if (username) {
        updatedUserData.username = username;
      }
      if (userInfo) {
        updatedUserData.userInfo = userInfo;
      }
      const updatedUser = await Admin.findByIdAndUpdate(
        userId,
        updatedUserData,
        { new: true }
      );
      res
        .status(200)
        .json({ message: "Profile updated successfully.", user: updatedUser });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  }
);

adminRouter.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Kiểm tra xem người dùng có tồn tại không
    const user = await Admin.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Tạo mã xác nhận ngẫu nhiên (có thể sử dụng thư viện như crypto để tạo mã)
    const confirmationCode = uuidv4();

    // Lưu mã xác nhận vào tài khoản người dùng
    user.confirmationCode = confirmationCode;
    await user.save();

    // Gửi email xác nhận với mã xác nhận
    const mailOptions = {
      from: "longvuxautrai12345@gmail.com",
      to: email,
      subject: "Reset Password Confirmation",
      text: `Your confirmation code is: ${confirmationCode}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: "Email could not be sent." });
      }
      console.log("Email sent: " + info.response);
      res
        .status(200)
        .json({ message: "Confirmation code sent to your email." });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(401).json({ message: "Access Token is missing." });
  }
  jwt.verify(token, "VinalinkGroup!2020", (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Access Token is not valid." });
    }
    req.user = user;
    next();
  });
};

adminRouter.put(
  "/update-video-admin", // Sử dụng videoId hoặc bất kỳ tham số xác định video nào
  checkAccessToken,
  upload.fields([
    { name: "movies", maxCount: 1 },
    { name: "thumbnails", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { actor, dateRelease, movieName, id, author } = req.body;
      // Tìm video theo videoId hoặc bất kỳ cách xác định video nào khác
      const existingVideo = await Movies.findById(id);
      const userWithMatchingId = await User.findById(req.user.id);
      if (!existingVideo) {
        return res.status(404).json({ message: "Video not found." });
      }


      // Xử lý tệp video mới nếu người dùng tải lên
      if (req.files.video) {
        const videoFile = req.files.video[0]; // Lấy video từ req.files

        // Tạo tên tệp duy nhất cho video mới
        const videoFileName = `videos/${
          existingVideo.email
        }/${movieName}/${uuidv4()}_${videoFile.originalname}`;

        // Tạo một tham chiếu đến tệp trên Firebase Storage
        const videoStorageRef = ref(storage, videoFileName);

        // Tải lên video mới lên Firebase Storage
        const snapshot = await uploadBytesResumable(
          videoStorageRef,
          videoFile.buffer
        );

        // Lấy URL của video mới sau khi tải lên thành công
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Cập nhật URL video trong thông tin video đã tồn tại
        existingVideo.movies = downloadURL;
      }

      // Xử lý tệp thumbnails mới nếu người dùng tải lên
      if (req.files.thumbnails) {
        const thumbnailsFile = req.files.thumbnails[0]; // Lấy thumbnails từ req.files

        // Tạo tên tệp duy nhất cho thumbnails mới
        const thumbnailsFileName = `videos/thumbnails/${
          existingVideo.email
        }/${movieName}/${uuidv4()}_${thumbnailsFile.originalname}`;

        // Tạo một tham chiếu đến tệp trên Firebase Storage
        const thumbnailsStorageRef = ref(storage, thumbnailsFileName);

        // Tải lên thumbnails mới lên Firebase Storage
        const thumb = await uploadBytesResumable(
          thumbnailsStorageRef,
          thumbnailsFile.buffer
        );

        // Lấy URL của thumbnails mới sau khi tải lên thành công
        const downloadURLThumb = await getDownloadURL(thumb.ref);

        // Cập nhật URL thumbnails trong thông tin video đã tồn tại
        existingVideo.thumbnails = downloadURLThumb;
      }

      // Cập nhật các thông tin khác của video nếu cần
      if (actor) {
        existingVideo.actor = actor;
      }
      if (dateRelease) {
        existingVideo.dateRelease = dateRelease;
      }
      if (movieName) {
        existingVideo.movieName = movieName;
      }
      if (author) {
        existingVideo.author = author;
      }
      // Lưu thông tin video đã cập nhật vào cơ sở dữ liệu
      await existingVideo.save();

      // Trả về thông tin video sau khi cập nhật
      res.status(200).json({ updatedVideo: existingVideo });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);


adminRouter.get("/all-acc", async (req, res) => {
  try {
    const acc = await User.find();
    res.status(200).json(acc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
adminRouter.get("/all-voucher", async (req, res) => {
  try {
    const acc = await Voucher.find();
    res.status(200).json(acc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
adminRouter.post("/create-voucher", async (req, res) => {
  try {
    const { detail, voucher } = req.body;
    console.log(voucher,detail);
    // Kiểm tra xem voucher đã tồn tại hay chưa bằng voucherCode
    const existingVoucher = await Voucher.findOne({ voucher: voucher });

    if (existingVoucher) {
      return res.status(400).json({ message: "Voucher đã tồn tại." });
    }

    // Tạo một voucher mới dựa trên dữ liệu từ req.body
    const newVoucher = new Voucher({
      detail, // Dùng dữ liệu từ detail để tạo voucher
      voucher: voucher,
    });

    await newVoucher.save();

    res.status(200).json({ message: "Tạo voucher thành công." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


export default adminRouter;
