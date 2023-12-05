import express from "express";
import User from "../models/userModel.js";
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
  deleteObject,
} from "firebase/storage";
import config from "../config/firebase.js";
import multer from "multer";
import FilmMaker from "../models/filmMaker.js";
import Movies from "../models/movies.js";
import Comment from "../models/comment.js";
import Star from "../models/star.js";

initializeApp(config.firebaseConfig);
const storage = getStorage();
const upload = multer({ storage: multer.memoryStorage() });

const filmMaker = express.Router();
filmMaker.post("/register-filmMaker", async (req, res) => {
  const { username, password, email } = req.body;

  try {
    const existingUser = await FilmMaker.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new FilmMaker({ username, password: hashedPassword, email });
    await user.save();

    res.status(201).json({ message: "Film maker registered successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
filmMaker.post("/login-filmMaker", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await FilmMaker.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (isPasswordValid) {
      const token = jwt.sign({ id: user._id }, "VinalinkGroup!2020", {
        expiresIn: "1h",
      });
      const refreshToken = jwt.sign({ id: user._id }, "YourRefreshSecretKey", {
        expiresIn: "7d",
      });
      res.status(200).json({ token, refreshToken, role: "filmMaker" });
    } else {
      res.status(401).json({ message: "Invalid password." });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
filmMaker.post("/refresh-token-filmMaker", (req, res) => {
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
filmMaker.post("/reset-password-filmMaker", async (req, res) => {
  const { email, confirmationCode, newPassword } = req.body;

  try {
    // Tìm người dùng với email và mã reset password khớp
    const user = await FilmMaker.findOne({ email, confirmationCode });
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
filmMaker.put(
  "/change-profile-filmMaker",
  checkAccessToken,
  upload.single("avatar"),
  async (req, res) => {
    const { username, userInfo } = req.body;
    try {
      const userId = req.user.id;
      const updatedUserData = {};

      // Kiểm tra xem người dùng đã tải lên hình ảnh avatar hay chưa
      if (req.file) {
        const user = await FilmMaker.findById(userId);
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
      const updatedUser = await FilmMaker.findByIdAndUpdate(
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

filmMaker.post("/forgot-password-filmMaker", async (req, res) => {
  const { email } = req.body;

  try {
    // Kiểm tra xem người dùng có tồn tại không
    const user = await FilmMaker.findOne({ email });
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
filmMaker.get("/profile-filmMaker", authenticateToken, async (req, res) => {
  try {
    const user = await FilmMaker.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const userWithoutPassword = { ...user.toObject() };
    delete userWithoutPassword.password;
    res.status(200).json({ user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
filmMaker.post(
  "/upload-video",
  checkAccessToken,
  upload.fields([
    { name: "movies", maxCount: 1 },
    { name: "thumbnails", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { actor, dateRelease, movieName, author } = req.body;
      const userId = req.user.id;
      const user = await FilmMaker.findById(userId);
      const videoFile = req.files.movies[0]; // Lấy video từ req.files
      const thumbnailsFile = req.files.thumbnails[0];
      // Tạo tên tệp duy nhất cho video (có thể sử dụng uuidv4 hoặc tên tệp tùy ý)
      const videoFileName = `videos/${user.email}/${movieName}/${uuidv4()}_${
        videoFile.originalname
      }`;
      const thumbnailsFileName = `videos/thumbnails/${
        user.email
      }/${movieName}/${uuidv4()}_${thumbnailsFile.originalname}`;
      // Tạo một tham chiếu đến tệp trên Firebase Storage
      const videoStorageRef = ref(storage, videoFileName);
      const thumbnailsStorageRef = ref(storage, thumbnailsFileName);

      // Tải lên video lên Firebase Storage
      const snapshot = await uploadBytesResumable(
        videoStorageRef,
        videoFile.buffer
      );
      const thumb = await uploadBytesResumable(
        thumbnailsStorageRef,
        thumbnailsFile.buffer
      );

      // Lấy URL của video sau khi tải lên thành công
      const downloadURL = await getDownloadURL(snapshot.ref);
      const downloadURLThumb = await getDownloadURL(thumb.ref);

      // Lưu thông tin video vào cơ sở dữ liệu
      const newMovie = new Movies({
        author: author,
        email: user.email,
        movies: downloadURL, // Lưu URL của video
        thumbnails: downloadURLThumb, // Bạn cần thêm thông tin thumnails tương tự
        movieName: movieName,
        actor: actor, // Lưu thông tin diễn viên
        dateRelease: dateRelease, // Lưu thông tin ngày phát hành
      });
      await newMovie.save();
      // Trả về URL của video để lưu trữ hoặc sử dụng trong ứng dụng của bạn
      res.status(200).json({ newMovie });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
filmMaker.put(
  "/update-video", // Sử dụng videoId hoặc bất kỳ tham số xác định video nào
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
      const userWithMatchingId = await FilmMaker.findById(req.user.id);
      if (!existingVideo) {
        return res.status(404).json({ message: "Video not found." });
      }
      console.log(existingVideo);
      // Kiểm tra quyền sở hữu của video trước khi chỉnh sửa (nếu cần)
      if (existingVideo.email !== userWithMatchingId.email) {
        return res
          .status(403)
          .json({ message: "You do not have permission to edit this video." });
      }
      console.log(req.files.movies);
      // Xử lý tệp video mới nếu người dùng tải lên
      if (req.files.movies) {
        const videoFile = req.files.movies[0]; // Lấy video từ req.files

        // Tạo tên tệp duy nhất cho video mới
        const videoFileName = `videos/${
          userWithMatchingId.email
        }/${movieName}/${uuidv4()}_${videoFile.originalname}`;
        console.log(videoFileName);
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
          userWithMatchingId.email
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
filmMaker.delete("/delete-video", checkAccessToken, async (req, res) => {
  try {
    const { id } = req.body;
    const userWithMatchingId = await FilmMaker.findById(req.user.id);
    // Kiểm tra xem video có tồn tại và thuộc về người dùng hiện tại hay không
    const existingVideo = await Movies.findById(id);
    console.log(existingVideo);

    if (!existingVideo) {
      return res.status(404).json({ message: "Video not found." });
    }
    console.log(userWithMatchingId);
    if (existingVideo.email !== userWithMatchingId.email) {
      return res.status(403).json({
        message: "You do not have permission to delete this video.",
      });
    }

    // Xóa video từ Firebase Storage
    const videoStorageRef = ref(storage, existingVideo.movies);
    await deleteObject(videoStorageRef);

    // Xóa video từ cơ sở dữ liệu
    await Movies.findByIdAndRemove(id);

    res.status(200).json({ message: "Video deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
filmMaker.get("/movies-of-filmMaker", checkAccessToken, async (req, res) => {
  try {
    const userWithMatchingId = await FilmMaker.findById(req.user.id);
    if (!userWithMatchingId) {
      return res.status(404).json({ message: "User not found." });
    }

    const movies = await Movies.find({ email: userWithMatchingId.email });

    res.status(200).json(movies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
filmMaker.post("/all-movies", async (req, res) => {
  try {
    const censorshipFilter = req.body.censorship;
    let movies;
    console.log(typeof censorshipFilter);

    if (censorshipFilter !== undefined) {
      movies = await Movies.find({ censorship: censorshipFilter });
    } else {
      movies = await Movies.find();
    }

    res.status(200).json(movies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
filmMaker.post("/detail-movie", async (req, res) => {
  try {
    const { id } = req.body;
    const movies = await Movies.findById(id);
    res.status(200).json(movies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
filmMaker.delete(
  "/delete-movie-foradmin",
  checkAccessToken,
  async (req, res) => {
    try {
      const userWithMatchingId = await User.findById(req.user.id);
      const { id } = req.body;
      console.log(id, req.user.id);
      if (!userWithMatchingId) {
        return res.status(404).json({ message: "User not found." });
      }

      if (userWithMatchingId.isAdmin) {
        // Kiểm tra xem movieId có tồn tại trong cơ sở dữ liệu
        const existingMovie = await Movies.findById(id);
        console.log(existingMovie);
        if (!existingMovie) {
          return res.status(404).json({ message: "Movie not found." });
        }

        // Xóa movie khỏi cơ sở dữ liệu
        await Movies.findByIdAndDelete(id);

        res.status(200).json({ message: "Movie deleted successfully." });
      } else {
        return res
          .status(403)
          .json({ message: "Access denied. User is not an admin." });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
filmMaker.post("/post-comment", async (req, res) => {
  try {
    const { idMovie, username, comment, avatar } = req.body;
    console.log(req.body);
    // Tạo một comment mới
    const newComment = new Comment({
      idMovie,
      username,
      comment,
      avatar,
    });

    // Lưu comment vào cơ sở dữ liệu
    await newComment.save();

    res
      .status(201)
      .json({ message: "Comment posted successfully.", comment: newComment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
filmMaker.post("/post-star", async (req, res) => {
  try {
    const { idMovie, username, star } = req.body;

    // Kiểm tra xem nếu có dữ liệu star cũ
    const existingStar = await Star.findOne({ idMovie, username });
    console.log(existingStar);
    if (existingStar) {
      // Nếu tồn tại, xoá dữ liệu cũ
      await Star.deleteOne({ idMovie, username });
    }

    // Tạo một star mới
    const newStar = new Star({
      idMovie,
      username,
      star,
    });

    // Lưu star vào cơ sở dữ liệu
    await newStar.save();

    res
      .status(201)
      .json({ message: "Star posted successfully.", star: newStar });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

filmMaker.post("/get-comment", async (req, res) => {
  try {
    const { idMovie } = req.body;
    console.log(idMovie);
    // Tạo một comment mới
    const comments = await Comment.find({ idMovie });

    // Lưu comment vào cơ sở dữ liệu
    res.status(200).json({ comment: comments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
filmMaker.post("/get-star", async (req, res) => {
  try {
    const { idMovie } = req.body;

    // Tìm tất cả các đánh giá có idMovie khớp với tham số
    const ratings = await Star.find({ idMovie });

    // Tính toán đánh giá trung bình
    const totalStars = ratings.reduce(
      (sum, rating) => sum + parseInt(rating.star),
      0
    );
    console.log(totalStars, ratings,'ccccc');
    const averageRating = totalStars / ratings.length;

    res.status(200).json({ averageRating: averageRating });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
filmMaker.post("/add-fav", async (req, res) => {
  try {
    const { idMovie, userId } = req.body;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Tìm thông tin phim dựa trên idMovie
    const movie = await Movies.findById(idMovie);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found." });
    }

    // Kiểm tra xem phim đã có trong mảng favMovie hay chưa
    const isMovieExist = user.favMovie.some((movie) => movie.id === idMovie);

    if (isMovieExist) {
      return res.status(200).json({ message: "Movie already in favorites." });
    }

    // Thêm phim vào mảng favMovie
    user.favMovie.push({
      id: idMovie,
      thumbnail: movie.thumbnails,
      movieName: movie.movieName,
    });

    // Lưu người dùng với mảng favMovie đã cập nhật
    await user.save();

    res
      .status(200)
      .json({ message: "Movie added to favorites successfully.", user });
  } catch (error) {
    console.error("Error adding favorite movie:", error);
    res.status(500).json({ error: error.message });
  }
});
filmMaker.delete("/remove-fav", async (req, res) => {
  try {
    const { idMovie, userId } = req.body;

    // Tìm người dùng dựa trên userId
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Kiểm tra xem phim có trong mảng favMovie hay không
    const isMovieExist = user.favMovie.some((movie) => movie.id === idMovie);

    if (!isMovieExist) {
      return res.status(404).json({ message: "Movie not in favorites." });
    }

    // Xóa phim khỏi mảng favMovie
    user.favMovie = user.favMovie.filter((movie) => movie.id !== idMovie);

    // Lưu người dùng với mảng favMovie đã cập nhật
    await user.save();

    res
      .status(200)
      .json({ message: "Movie removed from favorites successfully.", user });
  } catch (error) {
    console.error("Error removing favorite movie:", error);
    res.status(500).json({ error: error.message });
  }
});
export default filmMaker;
