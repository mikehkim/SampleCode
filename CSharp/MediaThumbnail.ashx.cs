using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Services;
using CRG.MediaServer.DataAccess;
using System.Data.Linq;
using CRG.Core.Utility;
using System.IO;

namespace CRG.MediaServer.Web
{
    /// <summary>
    /// Summary description for $codebehindclassname$
    /// </summary>
    [WebService(Namespace = "http://tempuri.org/")]
    [WebServiceBinding(ConformsTo = WsiProfiles.BasicProfile1_1)]
    public class MediaThumbnail : IHttpHandler
    {

        public void ProcessRequest(HttpContext context)
        {
            if (!string.IsNullOrEmpty(context.Request["mediaId"]))
            {
                Guid mediaId = new Guid(context.Request["mediaId"]);

                int width = 320;
                int height = 240;
                bool clip = false; //preserve aspect ratio
                bool stretch = false; //preserve image size if original image is too small
                int quality = 50;

                if ((context.Request["width"] != null))
                {
                    int.TryParse(context.Request["width"], out width);
                }
                if ((context.Request["clip"] != null))
                {
                    bool.TryParse(context.Request["clip"], out clip);
                }
                if ((context.Request["stretch"] != null))
                {
                    bool.TryParse(context.Request["stretch"], out stretch);
                }
                if ((context.Request["quality"] != null))
                {
                    int.TryParse(context.Request["quality"], out quality);
                }

                using (CRGMediaUploaderDataContext dc = new CRGMediaUploaderDataContext())
                {
                    MediaDetail md = dc.MediaDetails.SingleOrDefault(m => m.MediaId == mediaId);
                    if (md != null && md.Thumbnail != null && md.Thumbnail.Length > 0)
                    {
                        byte[] thumbnail = Image.GetThumbnail(md.Thumbnail.ToArray(), height, width, clip, stretch, quality);
                        context.Response.OutputStream.Write(thumbnail, 0, thumbnail.Length);
                        context.Response.ContentType = "image/jpeg";
                    }
                    else
                    {
                        string defImagePath = context.Request.PhysicalApplicationPath + "\\No-thumbnail.jpg";
                        Binary defImage = new System.Data.Linq.Binary(File.ReadAllBytes(defImagePath));
                        byte[] thumbnail = Image.GetThumbnail(defImage.ToArray(), height, width, clip, stretch, quality);
                        context.Response.OutputStream.Write(thumbnail, 0, thumbnail.Length);
                        context.Response.ContentType = "image/jpeg";
                    }
                }
            }
        }

        public bool IsReusable
        {
            get
            {
                return false;
            }
        }
    }
}
