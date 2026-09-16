// import express from 'express';
// import { addProperty, getNearbyProperties,deleteProperty, updateProperty, visitProperty,markPropertyAsSold,getSoldProperties,deleteSoldProperty, getMySoldProperties } from '../controllers/addController.js';
// import  upload  from '../middlewares/addUploads.js';
// import { verifyToken } from '../middlewares/authMiddleware.js';

// const router = express.Router();

// //  Add new property
// router.post('/add', upload.array("photosAndVideo", 10),verifyToken ,addProperty);

// //  Mark property as sold
// router.patch("/:id/mark-sold", verifyToken, markPropertyAsSold);


// //  Get all sold properties
// router.get("/sold", getSoldProperties);

// //  Delete sold property
// router.delete("/sold/:id", verifyToken, deleteSoldProperty);
// //  Get my sold properties
// router.get("/my-sold", verifyToken, getMySoldProperties);

// //  Visit property
// router.post("/:propertyId/visit", verifyToken, visitProperty);

// //  Get nearby properties

// router.get('/nearby', verifyToken, getNearbyProperties);

// // DELETE route by property ID
// router.delete('/delete/:id', deleteProperty);

// // UPDATE route by property ID
// router.put('/edit/:id', upload.array("photosAndVideo", 10), verifyToken , updateProperty);
// export default router;

import express from 'express';
import { addProperty, getNearbyProperties,deleteProperty, updateProperty, visitProperty,markPropertyAsSold,getSoldProperties,deleteSoldProperty, getMySoldProperties } from '../controllers/addController.js';
import  upload  from '../middlewares/addUploads.js';
import { verifyToken  } from '../middlewares/authMiddleware.js';
import { verifyAdminToken } from '../middlewares/adminAuthMiddleware.js';

const router = express.Router();

//  Add new property
router.post('/add', upload.array("photosAndVideo", 10),verifyToken ,addProperty);

// 2. ⭐ NEW ADMIN PROPERTY ADD ROUTE ⭐
// Route: POST /admin/add
// Middleware: file upload, token verification, and ADMIN role check
router.post('/admin/add', upload.array("photosAndVideo", 10),verifyAdminToken , addProperty);

//  Mark property as sold
router.patch("/:id/mark-sold", verifyToken, markPropertyAsSold);


//  Get all sold properties
router.get("/sold", getSoldProperties);

//  Delete sold property
router.delete("/sold/:id", verifyToken, deleteSoldProperty);
//  Get my sold properties
router.get("/my-sold", verifyToken, getMySoldProperties);

//  Visit property
router.post("/:propertyId/visit", verifyToken, visitProperty);

//  Get nearby properties

router.get('/nearby', verifyToken, getNearbyProperties);

// DELETE route by property ID
router.delete('/delete/:id', deleteProperty);

// UPDATE route by property ID
router.put('/edit/:id', upload.array("photosAndVideo", 10), verifyToken , updateProperty);
export default router;