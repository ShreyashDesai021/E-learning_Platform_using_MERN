// server/controllers/course.controller.js
import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import {
  deleteMediaFromCloudinary,
  deleteVideoFromCloudinary,
  uploadMedia,
} from "../utils/cloudinary.js";

/**
 * Escape string for use inside RegExp constructor
 */
function escapeRegex(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const createCourse = async (req, res) => {
  try {
    const { courseTitle, category } = req.body;
    if (!courseTitle || !category) {
      return res.status(400).json({
        success: false,
        message: "Course title and category is required.",
      });
    }

    const course = await Course.create({
      courseTitle,
      category,
      creator: req.id,
    });

    return res.status(201).json({
      success: true,
      course,
      message: "Course created.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to create course",
    });
  }
};

/**
 * Search courses - improved category parsing + case-insensitive matching.
 *
 * Query parameters:
 *   - query (string)
 *   - categories (array or comma-separated string of categories)
 *   - sortByPrice ("low" | "high")
 */
export const searchCourse = async (req, res) => {
  try {
    // Accept categories as: ?categories=HTML,Frontend%20Development
    // or as multiple ?categories=HTML&categories=Frontend%20Development (array)
    const { query = "", categories = "", sortByPrice = "" } = req.query;

    const searchCriteria = {
      isPublished: true,
      $or: [
        { courseTitle: { $regex: query, $options: "i" } },
        { subTitle: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ],
    };

    // Normalize incoming categories into an array of strings
    let cats = [];
    if (categories) {
      if (Array.isArray(categories)) {
        cats = categories.map((c) => String(c || "").trim()).filter(Boolean);
      } else {
        // comma separated string (client sends encoded strings joined by commas)
        cats = String(categories)
          .split(",")
          .map((c) => decodeURIComponent(String(c || "").trim()))
          .map((c) => c.replace(/\s+/g, " ").trim()) // normalize spaces
          .filter(Boolean);
      }
    }

    if (cats.length > 0) {
      // Build case-insensitive exact-match regexes for each category value
      const regexCats = cats.map((c) => new RegExp(`^${escapeRegex(c)}$`, "i"));
      searchCriteria.category = { $in: regexCats };
    }

    const sortOptions = {};
    if (sortByPrice === "low") sortOptions.coursePrice = 1;
    else if (sortByPrice === "high") sortOptions.coursePrice = -1;

    let courses = await Course.find(searchCriteria)
      .populate({ path: "creator", select: "name photoUrl" })
      .sort(sortOptions);

    return res.status(200).json({
      success: true,
      courses: courses || [],
    });
  } catch (error) {
    console.log("searchCourse error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search courses",
    });
  }
};

export const getPublishedCourse = async (_, res) => {
  try {
    const courses = await Course.find({ isPublished: true }).populate({
      path: "creator",
      select: "name photoUrl",
    });

    return res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to get published courses",
    });
  }
};

export const getCreatorCourses = async (req, res) => {
  try {
    const userId = req.id;
    const courses = await Course.find({ creator: userId });
    return res.status(200).json({
      success: true,
      courses: courses || [],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to get creator courses",
    });
  }
};

export const editCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { courseTitle, subTitle, description, category, courseLevel, coursePrice } = req.body;
    const thumbnail = req.file;

    let course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found!" });
    }

    let courseThumbnail;
    if (thumbnail) {
      if (course.courseThumbnail) {
        // derive public id and try delete old thumbnail
        const publicId = course.courseThumbnail.split("/").pop().split(".")[0];
        try {
          await deleteMediaFromCloudinary(publicId);
        } catch (err) {
          console.warn("Failed to delete old thumbnail:", err);
        }
      }
      // upload a thumbnail to cloudinary
      const uploaded = await uploadMedia(thumbnail.path);
      courseThumbnail = uploaded?.secure_url ?? uploaded?.url ?? null;
    }

    const updateData = {
      courseTitle,
      subTitle,
      description,
      category,
      courseLevel,
      coursePrice,
      courseThumbnail: courseThumbnail ?? course.courseThumbnail,
    };

    course = await Course.findByIdAndUpdate(courseId, updateData, { new: true });

    return res.status(200).json({
      success: true,
      course,
      message: "Course updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update course",
    });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate("creator", "name photoUrl");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found!" });
    }
    return res.status(200).json({ success: true, course });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to get course by id",
    });
  }
};

export const createLecture = async (req, res) => {
  try {
    const { lectureTitle } = req.body;
    const { courseId } = req.params;

    if (!lectureTitle || !courseId) {
      return res.status(400).json({ success: false, message: "Lecture title is required" });
    }

    // create lecture
    const lecture = await Lecture.create({ lectureTitle });

    const course = await Course.findById(courseId);
    if (course) {
      course.lectures.push(lecture._id);
      await course.save();
    }

    return res.status(201).json({
      success: true,
      lecture,
      message: "Lecture created successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Failed to create lecture" });
  }
};

export const getCourseLecture = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate("lectures");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    return res.status(200).json({ success: true, lectures: course.lectures });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Failed to get lectures" });
  }
};

export const editLecture = async (req, res) => {
  try {
    const { lectureTitle } = req.body;
    // videoInfo can be passed in different shapes; be defensive
    const incomingVideoInfo = req.body.videoInfo ?? req.body.video ?? null;
    const { courseId, lectureId } = req.params;

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found!" });
    }

    // Normalize incoming fields
    const incomingUrl =
      incomingVideoInfo?.videoUrl ??
      incomingVideoInfo?.url ??
      incomingVideoInfo?.secure_url ??
      incomingVideoInfo?.videoUrl;
    const incomingPublicId =
      incomingVideoInfo?.publicId ?? incomingVideoInfo?.public_id ?? null;

    // If new video uploaded, delete old one from Cloudinary (if any)
    if (incomingUrl || incomingPublicId) {
      if (lecture.publicId) {
        try {
          await deleteVideoFromCloudinary(lecture.publicId);
        } catch (err) {
          console.warn("Failed to delete old video from Cloudinary:", err);
        }
      }

      if (incomingUrl) lecture.videoUrl = incomingUrl;
      if (incomingPublicId) lecture.publicId = incomingPublicId;
    }

    // Update title and preview flag
    if (lectureTitle) lecture.lectureTitle = lectureTitle;
    // note: isPreviewFree may arrive as "true"/"false" strings; coerce to boolean
    if (typeof req.body.isPreviewFree !== "undefined") {
      lecture.isPreviewFree = req.body.isPreviewFree === true || req.body.isPreviewFree === "true";
    }

    await lecture.save();

    // Ensure the course still has the lecture id
    const course = await Course.findById(courseId);
    if (course && !course.lectures.includes(lecture._id)) {
      course.lectures.push(lecture._id);
      await course.save();
    }

    return res.status(200).json({
      success: true,
      lecture,
      message: "Lecture updated successfully.",
    });
  } catch (error) {
    console.log("editLecture error:", error);
    return res.status(500).json({ success: false, message: "Failed to edit lecture" });
  }
};

export const removeLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const lecture = await Lecture.findByIdAndDelete(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found!" });
    }
    if (lecture.publicId) {
      try {
        await deleteVideoFromCloudinary(lecture.publicId);
      } catch (err) {
        console.warn("Failed to delete video from Cloudinary:", err);
      }
    }

    // remove the lecture reference from associated course
    await Course.updateOne({ lectures: lectureId }, { $pull: { lectures: lectureId } });

    return res.status(200).json({ success: true, message: "Lecture removed successfully." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Failed to remove lecture" });
  }
};

export const getLectureById = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found!" });
    }
    return res.status(200).json({ success: true, lecture });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Failed to get lecture by id" });
  }
};

export const togglePublishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { publish } = req.query; // expected "true" or "false"
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found!" });
    }
    course.isPublished = publish === "true";
    await course.save();
    const statusMessage = course.isPublished ? "Published" : "Unpublished";
    return res.status(200).json({ success: true, message: `Course is ${statusMessage}` });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Failed to update status" });
  }
};
