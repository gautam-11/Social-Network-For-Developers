const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const passport = require('passport')
// Post model
const Post = require('../../models/Post')
// Profile model
const Profile = require('../../models/Profile')

// Validation
const validatePostInput = require('../../validation/post')
// @route GET api/posts/test
// @desc Tests post route
// @access public
router.get('/test', (req, res) => {
  res.json({ msg: 'Posts works!' })
})

// @route GET api/posts/
// @desc Get posts
// @access Public

router.get('/', (req, res) => {
  Post.find()
    .sort({ date: -1 })
    .then(posts => res.json(posts))
    .catch(err => res.status(404).json({ msg: 'No posts found' }))
})

// @route GET api/posts/:id
// @desc Get post by id
// @access Public
router.get('/:id', (req, res) => {
  Post.findById(req.params.id)
    .then(post => res.json(post))
    .catch(err => res.status(404).json({ msg: 'No post found with that id ' }))
})

// @route POST api/posts/
// @desc Creates a post
// @access private
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body)

    // Check Validation
    if (!isValid) {
      return res.status(400).json(errors)
    }
    const newPost = new Post({
      text: req.body.text,
      name: req.body.name,
      avatar: req.body.avatar,
      user: req.user.id
    })

    newPost
      .save()
      .then(post => res.json(post))
      .catch(err => res.status(500).json({ msg: 'Something went wrong..' }))
  }
)

// @route DELETE api/posts/:id
// @desc Deletes a post
// @access Private

router.delete(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id })
      .then(profile => {
        Post.findById(req.params.id).then(post => {
          // Check for post owner
          if (post.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' })
          }

          // Delete
          post
            .remove()
            .then(() => res.json({ success: true }))
            .catch(err =>
              res.status(404).json({ postnotfound: 'No post found' })
            )
        })
      })
      .catch(err => res.status(500).json(err))
  }
)

// @route POST api/posts/like/:id
// @desc Like post
// @access Private

router.post(
  '/like/:id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id })
      .then(profile => {
        Post.findById(req.params.id).then(post => {
          if (
            post.likes.filter(like => like.user.toString() === req.user.id)
              .length > 0
          ) {
            return res
              .status(400)
              .json({ alreadyLiked: 'You have already liked this post' })
          }
          // Add user id to likes array
          post.likes.unshift({ user: req.user.id })

          post
            .save()
            .then(post => res.json(post))
            .catch(err => res.status(500).json(err))
        })
      })
      .catch(err => res.status(500).json(err))
  }
)

// @route POST api/posts/unlike/:id
// @desc UnLike post
// @access Private

router.post(
  '/unlike/:id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id })
      .then(profile => {
        Post.findById(req.params.id).then(post => {
          if (
            post.likes.filter(like => like.user.toString() === req.user.id)
              .length === 0
          ) {
            return res
              .status(400)
              .json({ NotLikedYet: 'You have not yet liked this post' })
          }
          const removeIndex = post.likes
            .map(like => like.user.toString())
            .indexOf(req.user.id)

          post.likes.splice(removeIndex, 1)

          post
            .save()
            .then(post => res.json(post))
            .catch(err => res.status(500).json(err))
        })
      })
      .catch(err => res.status(500).json(err))
  }
)

// @route POST api/posts/comment/:id
// @desc Add comment to a post
// @access Private

router.post(
  '/comment/:id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body)

    // Check Validation
    if (!isValid) {
      return res.status(400).json(errors)
    }

    Post.findById(req.params.id)
      .then(post => {
        const newComment = {
          text: req.body.text,
          name: req.body.name,
          avatar: req.body.avatar,
          user: req.user.id
        }
        // Add to comments array
        post.comments.unshift(newComment)

        // Save
        post
          .save()
          .then(post => res.json(post))
          .catch(err => res.status(500).json(err))
      })
      .catch(err => res.status(404).json({ msg: 'Post not found' }))
  }
)

// @route DELETE api/posts/comment/:id/:comment_id
// @desc  Remove comment from post
// @access Private

router.delete(
  '/comment/:id/:comment_id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    
    Post.findById(req.params.id)
      .then(post => {

        // Check to see if comment exists
        if(post.comments.filter(comment => comment._id.toString() === req.params.comment_id )
        .length === 0)
        {
          return res.status(404).json({commentNotExist : 'Comment does not exist!'})
        }

        // Get remove index
        const removeIndex = post.comments 
          .map(item => item._id.toString())
          .indexOf(req.params.comment_id)

        post.comments.splice(removeIndex , 1)

        post.save().then(post => res.json(post))
        .catch(err => res.status(500).json({msg: 'Error in deleteing comment'}) )
        
      })
      .catch(err => res.status(404).json({ msg: 'Post not found' }))
  }
)

module.exports = router
