const formidable = require('formidable');
const { v4: uuidv4 } = require('uuid');
const fs = require("fs")
const { check, validationResult } = require("express-validator")
const Users = require("../models/User")
const Posts = require("../models/Posts")
const dateFormat = require('dateformat');
const path = require("path")
const postForm = (req, res) => {
    res.render('createPost', { title: 'Create new post', login: true, errors: [], input_title: '', body: '' })
}



const storePost = (req, res) => {
    const form = new formidable.IncomingForm({
        uploadDir: path.join(__dirname, '../views', 'assets', 'img', 'temp'),
        keepExtensions: true, // Keep file extensions
    });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('Form parsing error:', err);
            return res.status(500).send('Error while parsing form data.');
        }

        const { title, body } = fields;
        const imageFile = files.image; // Get the uploaded image file

        const errors = [];

        // Validate title and body
        if (!title) {
            errors.push({ msg: 'Title is required' });
        }
        if (!body) {
            errors.push({ msg: 'Body is required' });
        }



        if (errors.length !== 0) {
            return res.render("createPost", {
                title: 'Create new post',
                login: true,
                errors,
                input_title: title,
                body
            });
        }

        try {


            console.log("reached here", typeof imageFile.name)
            console.log("reached here", imageFile.name)
            const newImagePath = path.join(__dirname, '../views', 'assets', 'img', '1.jpg');
            console.log("reached here __dirname", __dirname)
            console.log("reached here newImagePath", newImagePath)

            fs.renameSync(imageFile.path, newImagePath);

            // Assuming you have a user ID
            const userId = req.id;

            // Find the user
            const user = await Users.findOne({ _id: userId });
            if (!user) {
                return res.status(404).send('User not found');
            }

            // Create a new post
            const newPost = new Posts({
                userID: userId,
                title,
                body,
                image: imageFile.name,
                userName: user.name
            });

            // Save the new post
            try {
                const result = await newPost.save();
                if (result) {
                    req.flash('success', "Your post has been added successfully");
                    return res.redirect('/posts/1');
                }
            } catch (err) {
                console.error('Post save error:', err);
                return res.status(500).send('Error while saving post.');
            }
        } catch (err) {
            console.error('Server error:', err);
            return res.status(500).send('Internal server error.');
        }
    });
}

module.exports = storePost;


const posts = async (req, res) => {
    const id = req.id;
    let currentPage = 1;
    let page = req.params.page;
    if (page) {
        currentPage = page;
    }
    const perPage = 4;
    const skip = (currentPage - 1) * perPage;
    const allPosts = await Posts.find({ userID: id })
        .skip(skip)
        .limit(perPage)
        .sort({ updatedAt: -1 });
    const count = await Posts.find({ userID: id }).countDocuments();
    res.render("Posts", { title: 'Posts', login: true, posts: allPosts, formate: dateFormat, count, perPage, currentPage })
}

const details = async (req, res) => {
    const id = req.params.id;
    try {
        const details = await Posts.findOne({ _id: id });
        res.render('details', { title: 'Post details', login: true, details })
    } catch (err) {
        res.send(err)
    }
}

const updateForm = async (req, res) => {
    const id = req.params.id;
    try {
        const post = await Posts.findOne({ _id: id });
        res.render('update', { title: 'Update Post', login: true, errors: [], post });
    } catch (err) {
        res.send(err)
    }
}

const postValidations = [
    check('title').not().isEmpty().withMessage('Title is required'),
    check('body').not().isEmpty().withMessage('Body is required')
]

const postUpdate = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const id = req.body.hiddenID;
        const post = await Posts.findOne({ _id: id });
        res.render('update', { title: 'Update Post', login: true, errors: errors.array(), post });
    } else {
        const { hiddenID, title, body } = req.body;
        try {
            const updateResult = await Posts.findByIdAndUpdate(hiddenID, { title, body })
            if (updateResult) {
                req.flash('success', "Your post has been updated successfully")
                res.redirect('/posts/1')
            }
        } catch (err) {
            res.send(err)
        }
    }
}

const deletePost = async (req, res) => {
    const id = req.body.deleteID;
    try {
        const response = await Posts.findByIdAndRemove(id);
        if (response) {
            req.flash('success', "Your post has been deleted successfully")
            res.redirect('/posts/1')
        }
    } catch (err) {
        res.send(err)
    }
}

module.exports = {
    postForm,
    storePost,
    posts,
    details,
    updateForm,
    postUpdate,
    postValidations,
    deletePost
}