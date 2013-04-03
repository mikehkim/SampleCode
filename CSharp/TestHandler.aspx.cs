using System;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Diagnostics;
using System.Configuration;
using System.Web.UI.WebControls;
using System.Collections.Generic;

using CRG.MediaServer.Api;
using CRG.MediaServer.Common;
using CRG.MediaServer.DataAccess;
using CRG.MediaServer.Exceptions;
using CRG.MediaServer.Utilities;

using Telerik.Web.UI;

namespace CRG.MediaServer.Web
{
    public partial class TestHandler : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            string AuthKey = Request.QueryString["AuthKey"];
            string Password = Request.QueryString["Password"];
            string ClientId = Request.QueryString["ClientId"];

            if (!string.IsNullOrEmpty(AuthKey) && !string.IsNullOrEmpty(Password) && !string.IsNullOrEmpty(ClientId))
            {
                UploadRequest uploadRequest = new UploadRequest();
                uploadRequest.MediaId = Guid.NewGuid();
                uploadRequest.AuthKey = AuthKey;
                uploadRequest.Password = Password;
                uploadRequest.ClientId = int.Parse(ClientId);
                string encryptedMediaRequest = uploadRequest.Encrypt(SystemPreferences.Get(Constants.SystemPreferences.PUBLIC_KEY));
                
                string mediaRequest = "~/CRGMediaUpload.aspx?MediaRequest={0}";
                string url = string.Format(mediaRequest, HttpUtility.UrlEncode(encryptedMediaRequest));
                Response.Redirect(url, false);
            }


            StreamPublisherHelper publisherHelper = new StreamPublisherHelper();
            string mediaId = string.Empty;
            string encyptedId = string.Empty;
            if (publisherHelper.GetMediaContentsByMediaType(11, 4).FirstOrDefault() != null)
            {
                mediaId = publisherHelper.GetMediaContentsByMediaType(11, 4).FirstOrDefault().MediaId.ToString();
                encyptedId = EncryptionHandler.EncryptMediaId(mediaId, SystemPreferences.Get(Constants.SystemPreferences.MEDIA_KEY));
                HyperLink1.NavigateUrl = "GetMedia.aspx?MediaId=" + encyptedId;
            }
            if (publisherHelper.GetMediaContentsByMediaType(11, 3).FirstOrDefault() != null)
            {
                mediaId = publisherHelper.GetMediaContentsByMediaType(11, 3).FirstOrDefault().MediaId.ToString();
                encyptedId = EncryptionHandler.EncryptMediaId(mediaId, SystemPreferences.Get(Constants.SystemPreferences.MEDIA_KEY));
                HyperLink2.NavigateUrl = "GetMedia.aspx?MediaId=" + encyptedId;
            }
            if (publisherHelper.GetMediaContentsByMediaType(11, 2).FirstOrDefault() != null)
            {
                mediaId = publisherHelper.GetMediaContentsByMediaType(11, 2).FirstOrDefault().MediaId.ToString();
                encyptedId = EncryptionHandler.EncryptMediaId(mediaId, SystemPreferences.Get(Constants.SystemPreferences.MEDIA_KEY));
                HyperLink3.NavigateUrl = "GetMedia.aspx?MediaId=" + encyptedId;
            }
            if (publisherHelper.GetMediaContentsByMediaType(11, 1).FirstOrDefault() != null)
            {
                mediaId = publisherHelper.GetMediaContentsByMediaType(11, 1).FirstOrDefault().MediaId.ToString();
                encyptedId = EncryptionHandler.EncryptMediaId(mediaId, SystemPreferences.Get(Constants.SystemPreferences.MEDIA_KEY));
                HyperLink4.NavigateUrl = "GetMedia.aspx?MediaId=" + encyptedId;
            }
            //GetAllMediaLinks();
        }
        private void GetAllMediaLinks()
        {
            int clientId = 11;
            StreamPublisherHelper publisherHelper = new StreamPublisherHelper();
            string mediaId = string.Empty;
            string encyptedId = string.Empty;

            for (int mediaType = 1; mediaType <= 4; mediaType++)
            {
                List<MediaDetail> MediaDetails = new List<MediaDetail>();
                MediaDetails = publisherHelper.GetMediaContentsByMediaType(clientId, mediaType).OrderByDescending(r => r.ReceivedDate).ToList();
                AllMediaLinks.Text += "<hr /><p>MediaType " + mediaType + "</p>\n";
                foreach (MediaDetail md in MediaDetails)
                {
                    mediaId = md.MediaId.ToString();
                    encyptedId = EncryptionHandler.EncryptMediaId(mediaId, SystemPreferences.Get(Constants.SystemPreferences.MEDIA_KEY));
                    string mediaUrl = "GetMedia.aspx?MediaId=" + encyptedId;
                   AllMediaLinks.Text += string.Format("<p><a href=\"{0}\" title=\"{0}\"><img src=\"{0}\" style=\"max-width: 100px;max-height:64px;\" />{1}</a></p>\n",
                        mediaUrl, md.OriginalMediaFile);
                        //md.OriginalMediaFormat + "; " + md.MediaFileURL + "; " + md.MediaFileSize + "; " + md.Duration + "; ");
                    //if (mediaType == 3) //picture
                    //{
                    //    AllMediaLinks.Text += string.Format("<p></p>", mediaUrl);
                    //}
                }

            }
        }
        protected void UploadClick(object sender, EventArgs e)
        {
            try
            {

                //string url = "http://64.60.103.146/CRGMediaUploader/TestService.aspx";
                UploadRequest uploadRequest = new UploadRequest();
                uploadRequest.MediaId = Guid.NewGuid();
                uploadRequest.AuthKey = "asdf";
                uploadRequest.Password = "asdf";
                uploadRequest.ClientId = 11;
                string encryptedMediaRequest = uploadRequest.Encrypt(SystemPreferences.Get(Constants.SystemPreferences.PUBLIC_KEY));
                //
                string mediaRequest = "~/CRGMediaUpload.aspx?MediaRequest={0}";
                string url = string.Format(mediaRequest, HttpUtility.UrlEncode(encryptedMediaRequest));
                Response.Redirect(url, false);
            }
            catch (Exception ex)
            {
                Response.Write(ex);
            }
        }
    }
}
