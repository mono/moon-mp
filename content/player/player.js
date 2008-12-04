function delegate (target, callback) {
    return function () { callback.apply (target, arguments); }
}

__MoonEmbeddedMediaPlayer = function (silverDom) {
    this.silver = silverDom;
    this.silver.OnLoad = delegate (this, this._OnLoad);
}

__MoonEmbeddedMediaPlayer.prototype = {
    silver: null,
    xaml: null,
    loaded: false,
    
    percent_complete: 0,
    percent_buffered: 0,

    video_zoom: 1.0,
    video_fit_window: true,
    video_larry_mode: false,
    loop_playback: false,
    max_video_width: 0,
    max_video_height: 0,

    // spacing inside the control bar
    control_spacing: 3,
    control_block_spacing: 6,
    control_seek_spacing: 3,
    
    // spacing/sizing of the bar itself
    control_bar_height: 28,    // how tall
    control_bar_radius: 0,     // how round
    control_bar_spacing: 0,    // how far from edge
    control_bar_docked: false, // does video snap to or slide under the bar
    
    // state for showing/hiding the bar
    control_bar_visible_top: -1,
    control_bar_hidden_top: -1,
    
    _OnLoad: function (control, context, root_element) {
        alert ("OMG");
        this._LoadElements (control);
        this._ConstructInterface ();
        this._ConnectEvents ();
        this._MapAttributes ();
        this.Idle ();
        
        // Install WMP API directly on the <embed> SL object
        this.ExtendSilver ();

        this.silver.Content.OnResize = delegate (this, this._OnResize);
        this.silver.Content.OnFullScreenChange = delegate (this, this._OnFullScreenChange);
        this.loaded = true;
    },
    
    _LoadElements: function (control) {
        this.xaml = {
            // Controls/UI
            root:                 control,

            background:           control.FindName ("Background"),

            video_element:        control.FindName ("VideoElement"),
            video_window:         control.FindName ("VideoWindow"),
            video_brush:          control.FindName ("VideoBrush"),

            control_bar:          control.FindName ("ControlBar"),
            control_bar_bg:       control.FindName ("ControlBarBackground"),
            left_controls:        control.FindName ("LeftControls"),
            center_controls:      control.FindName ("CenterControls"),
            right_controls:       control.FindName ("RightControls"),

            seek_slider:          control.FindName ("SeekSlider"),
            seek_slider_border:   control.FindName ("SeekSliderBorder"),
            seek_slider_trough:   control.FindName ("SeekSliderTrough"),
            seek_slider_played:   control.FindName ("SeekSliderPlayed"),
            seek_slider_buffered: control.FindName ("SeekSliderBuffered"),
            position:             control.FindName ("Position"),
            position_text:        control.FindName ("PositionText"),

            play_button:          this._CreateButton ("PlayButton", "PlayPauseIcons"),

            options_button:       this._CreateButton ("OptionsButton"),
            
            // Storyboards and Animations
            control_bar_storyboard:        control.FindName ("ControlBarStoryboard"),
            control_bar_animation:         control.FindName ("ControlBarAnimation"),
            seek_slider_played_storyboard: control.FindName ("SeekSliderPlayedStoryboard"),
            seek_slider_played_animation:  control.FindName ("SeekSliderPlayedAnimation"),
        };
        
        this.xaml.play_icon_storyboard  = this.xaml.play_button.FindName ("PlayIconStoryboard");
        this.xaml.play_icon_animation   = this.xaml.play_button.FindName ("PlayIconAnimation");
        this.xaml.pause_icon_storyboard = this.xaml.play_button.FindName ("PauseIconStoryboard");
        this.xaml.pause_icon_animation  = this.xaml.play_button.FindName ("PauseIconAnimation");
        
        control.FindName ("ErrorOverlay").Visibility = "Collapsed";
    },

    _ConstructInterface: function () {
        this._ContainerPack (this.xaml.left_controls, this.xaml.play_button);
        this._ContainerPack (this.xaml.right_controls, this.xaml.options_button);
    },

    _ContainerPack: function (container, child, leading_pad) {
        var left = 0;
        for (var i = 0, n = container.Children.Count; i < n; i++) {
            var _child = container.Children.GetItem (i);
            left += _child["Canvas.Left"];
            if (i == n - 1) {
                left += _child.Width + leading_pad;
            }
        }
        
        child["Canvas.Left"] = left;
        container.Children.Add (child);
    },

    _ContainerAutosize: function (container) {
        var max_width = 0;
        var max_height = 0;

        for (var i = 0, n = container.Children.Count; i < n; i++) {
            var child = container.Children.GetItem (i);
            max_width = Math.max (child["Canvas.Left"] + child.Width, max_width);
            max_height = Math.max (child.Height, max_height);
        }

        container.Width = max_width;
        container.Height = max_height;
    },

    _ConnectEvents: function () {
        this.xaml.root.AddEventListener ("keydown", delegate (this, this._OnKeyDown));
        this.xaml.root.AddEventListener ("mouseenter", delegate (this, this._OnMouseEnter));
        this.xaml.root.AddEventListener ("mouseleave", delegate (this, this._OnMouseLeave));
        
        this.xaml.play_button.AddEventListener ("mouseleftbuttondown", delegate (this, this._OnPlayPauseClicked));

        this.xaml.video_element.AddEventListener ("currentstatechanged", delegate (this, this._OnMediaCurrentStateChanged));
        this.xaml.video_element.AddEventListener ("mediaopened", delegate (this, this._OnMediaOpened));
        this.xaml.video_element.AddEventListener ("mediaended", delegate (this, this._OnMediaEnded));
    },
    
    _MapAttributes: function () {
        // WMP attributes mapped from <embed> 
        function to_bool (x) {
            return x.toLowerCase () == "true";
        }
        
        for (var i = 0, n = this.silver.attributes.length; i < n; i++) {
            var value = this.silver.attributes[i].nodeValue;
            switch (this.silver.attributes[i].nodeName.toLowerCase ()) {
                case "bgcolor":      this.xaml.background.Fill = value; break;
                case "showcontrols": this.xaml.control_bar.Visibility = to_bool (value) ? "Visible" : "Collapsed"; break;
                
                case "autostart":    this.xaml.video_element.AutoPlay = to_bool (value); break;
                case "loop":         this.loop_playback = to_bool (value); break;
                
                case "source":
                case "src":
                case "filename":
                case "url":          this.LoadSource (value); break;
            }
        }
    },

    // Layout and Positioning Logic

    _OnResize: function () {
        this.xaml.background.Width = this.silver.Content.ActualWidth;
        this.xaml.background.Height = this.silver.Content.ActualHeight; 

        // position the main control bar
        this.xaml.control_bar.Height = this.control_bar_height;
        this.xaml.control_bar.Left = this.control_bar_docked ? 0 : this.control_bar_spacing;
        this.control_bar_visible_top = this.xaml.background.Height - this.xaml.control_bar.Height - 
            this.xaml.control_bar.Left;
        this.control_bar_hidden_top = this.xaml.background.Height + this.xaml.control_bar.Height;
        this.xaml.control_bar.Width = this.xaml.background.Width - (2 * this.xaml.control_bar.Left);
        this.xaml.control_bar.Top = this.control_bar_hidden_top;
        
        this.xaml.control_bar_bg.Width = this.xaml.control_bar.Width;
        this.xaml.control_bar_bg.Height = this.xaml.control_bar.Height;
        this.xaml.control_bar_bg.RadiusX = this.control_bar_docked ? 0 : this.control_bar_radius;
        this.xaml.control_bar_bg.RadiusY = this.xaml.control_bar_bg.RadiusX;

        // position the left control group
        this._ContainerAutosize (this.xaml.left_controls);
        this.xaml.left_controls.Left = this.xaml.left_controls.Top = this.control_spacing;

        // position the right control group
        this._ContainerAutosize (this.xaml.right_controls);
        this.xaml.right_controls.Left = this.xaml.background.Width - 
            this.xaml.right_controls.Width - this.control_spacing;
        this.xaml.right_controls.Top = this.control_spacing;

        // position the center control group
        this.xaml.center_controls.Left = this.xaml.left_controls.Left + 
            this.xaml.left_controls.Width + this.control_block_spacing;
        this.xaml.center_controls.Top = this.control_spacing;
        this.xaml.center_controls.Width = this.xaml.control_bar.Width - this.xaml.center_controls.Left - 
            this.xaml.right_controls.Width - (2 * this.control_block_spacing);
        this.xaml.center_controls.Height = this.xaml.left_controls.Height;
        this._PositionSlider (false);

        // calculate video constraints
        this.max_video_width = this.xaml.background.Width;
        this.max_video_height = this.xaml.background.Height;
        if (this.control_bar_docked) {
            this.max_video_height -= this.xaml.control_bar.Height;
        }

        this._PositionVideo ();
    },

    _OnFullScreenChange: function () {
        this._OnResize ();
    },

    _PositionSlider: function (smoothUpdate) {
        // In case we need to clip...
        // this.xaml.position_text.Clip = "M 0,0 H" + this.xaml.position.Width + " V" + 
        //     this.xaml.position.Height + " H0 Z";

        // Compute the text box width and round up to the nearest 10 pixels to prevent
        // the slider from jittering if text width changes by a pixel or two
        var t_actual = this.xaml.position_text.ActualWidth;
        var t_width = Math.ceil (t_actual);
        t_width += 10 - t_width % 10;

        this.xaml.position.Width = t_width;
        this.xaml.position.Height = this.xaml.center_controls.Height;

        this.xaml.position_text["Canvas.Left"] = (t_width - t_actual) / 2;
        this.xaml.position_text["Canvas.Top"] = (this.xaml.position.Height - 
            this.xaml.position_text.ActualHeight) / 2;

        this.xaml.seek_slider.Height = this.xaml.center_controls.Height;
        this.xaml.seek_slider.Width = this.xaml.center_controls.Width - this.xaml.position.Width;
        this.xaml.seek_slider_trough.Width = this.xaml.seek_slider_border.Width = this.xaml.seek_slider.Width;

        this.xaml.seek_slider["Canvas.Top"] = (this.xaml.seek_slider.Height - 
            this.xaml.seek_slider_trough.Height) / 2;
            
        this.xaml.position.Left = this.xaml.seek_slider.Width + this.control_seek_spacing;
        
        var played_width = this.xaml.seek_slider_trough.Width * this.percent_complete;
        if (smoothUpdate) {
            // We use a storyboard to update the position bar to smooth the pixels between clock updates
            this.xaml.seek_slider_played_animation.To = played_width;
            this.xaml.seek_slider_played_storyboard.Begin ();
        } else {
            this.xaml.seek_slider_played_storyboard.Stop ();
            this.xaml.seek_slider_played.Width = played_width;
        }
    },

    _PositionVideo: function () {
        var frame_width = this.video_fit_window 
            ? this.max_video_width 
            : this.xaml.video_element.NaturalVideoWidth * this.video_zoom;

        var frame_height = this.video_fit_window 
            ? this.max_video_height 
            : this.xaml.video_element.NaturalVideoHeight * this.video_zoom;

        if (this.video_larry_mode) {
            // this exists just to easily test some fixes Larry is working on; never use
            this.xaml.video_window.Width = this.max_video_width;
            this.xaml.video_window.Height = this.max_video_height;
            this.xaml.video_brush.Stretch = "None"; 
        } else {
            this.xaml.video_window.Width = frame_width > this.max_video_width 
                ? this.max_video_width 
                : frame_width;

            this.xaml.video_window.Height = frame_height > this.max_video_height 
                ? this.max_video_height 
                : frame_height;

            this.xaml.video_window["Canvas.Left"] = (this.max_video_width - this.xaml.video_window.Width) / 2;
            this.xaml.video_window["Canvas.Top"] = (this.max_video_height - this.xaml.video_window.Height) / 2;

            this.xaml.video_brush.Stretch = "Uniform";
        }

        this.xaml.video_window.Visibility = this.xaml.video_element.NaturalVideoWidth > 0 && 
            this.xaml.video_element.NaturalVideoHeight > 0 && frame_width > 0 && frame_height > 0 
            ? "Visible" 
            : "Collapsed";
    },

    // Media/UI Interaction and Control

    LoadSource: function (source) {
        this.Log ("Loading source: " + source);
        this.xaml.video_element.Source = source;
    },
    
    Idle: function () {
        this._UpdatePositionDuration (0, 0, false);
    },

    _UpdatePositionDuration: function (position, duration, smoothUpdate) { 
        var runs = this.xaml.position_text.Inlines.Count;        
        this.xaml.position_text.Inlines.GetItem (0).Text = this._FormatSeconds (position);
        this.xaml.position_text.Inlines.GetItem (runs - 1).Text = this._FormatSeconds (duration);
        this.percent_complete = duration <= 0 ? 0 : position / duration;
        this.percent_buffered = 0;
        this._PositionSlider (smoothUpdate);
    },

    _OnKeyDown: function (o, args) {
        if (args.Key == 35 || args.Key == 66) {
            o.GetHost ().Content.FullScreen = true;
        }
    },
    
    _OnMouseEnter: function (o, args) {
        this.xaml.control_bar_animation.To = this.control_bar_visible_top;
        this.xaml.control_bar_storyboard.Begin ();
    },
    
    _OnMouseLeave: function (o, args) {
        this.xaml.control_bar_animation.To = this.control_bar_hidden_top;
        this.xaml.control_bar_storyboard.Begin ();
    },
    
    _OnMediaCurrentStateChanged: function (o, args) {
        this.Log ("Media Element State Change: " + o.CurrentState);
        switch (o.CurrentState) {
            case "Opening":
            case "Buffering":
                break;
            case "Playing":
                this.xaml.play_icon_animation.To = 0;
                this.xaml.pause_icon_animation.To = 1;
                this.xaml.play_icon_storyboard.Begin ();
                this.xaml.pause_icon_storyboard.Begin ();
                
                this.xaml.seek_slider_played_storyboard.Resume ();
                
                this.timeout = setInterval (delegate (this, this._OnUpdatePosition), 500);
                break;
            case "Paused":
            case "Stopped":
                clearInterval (this.timeout);
            
                this.xaml.play_icon_animation.To = 1;
                this.xaml.pause_icon_animation.To = 0;
                this.xaml.play_icon_storyboard.Begin ();
                this.xaml.pause_icon_storyboard.Begin ();
                
                this.xaml.seek_slider_played_storyboard.Pause ();
                
                if (o.CurrentState == "Stopped") {
                    this._UpdatePositionDuration (0, 0, false);
                }
                break;
        }
    },
    
    _OnMediaOpened: function (o, args) {
        this._PositionVideo ();
    },

    _OnMediaEnded: function (o, args) {
        this.Idle ();
        
        if (this.loop_playback) {
            this.Log ("Looping playback of current source");
            this.xaml.video_element.Play ();
        }
    },

    _OnUpdatePosition: function () {
        if (this.xaml.video_element.CurrentState == "Playing") {
            this._UpdatePositionDuration (this.xaml.video_element.Position.Seconds,
                this.xaml.video_element.NaturalDuration.Seconds, true);
        }
    },

    _OnPlayPauseClicked: function (o, args) {
        if (this.xaml.video_element.CurrentState == "Playing") {
            this.xaml.video_element.Pause ();
        } else {
            this.xaml.video_element.Play ();
        }
    },

    // Utility Methods

    _FormatSeconds: function (seconds) {
        return Math.floor (seconds / 60) + ":" + 
            (seconds % 60 < 10 ? "0" : "") +
            Math.floor (seconds % 60);
    },

    // XAML Templates

    _CreateButton: function (name, icon_name) {
        var button = this.silver.Content.createFromXaml ('\
            <Canvas Name="' + name + '" Width="27" Height="22" Background="transparent"> \
              <Rectangle Width="27" Height="22" RadiusX="2" RadiusY="2"> \
                <Rectangle.Fill> \
                  <LinearGradientBrush Name="' + name + 'Fill" StartPoint="0,0" EndPoint="0,1" Opacity="0"> \
                    <GradientStop Offset="0.0" Color="#7fff"/> \
                    <GradientStop Offset="0.2" Color="#6fff"/> \
                    <GradientStop Offset="0.8" Color="#0fff"/> \
                  </LinearGradientBrush> \
                </Rectangle.Fill> \
              </Rectangle> \
              <Rectangle Width="27" Height="22" RadiusX="2" RadiusY="2"> \
                <Rectangle.Stroke> \
                  <LinearGradientBrush Name="' + name + 'Border" StartPoint="0,0" EndPoint="0,1" Opacity="0"> \
                    <GradientStop Offset="0.0" Color="#afff"/> \
                    <GradientStop Offset="1.0" Color="#0fff"/> \
                  </LinearGradientBrush> \
                </Rectangle.Stroke> \
              </Rectangle> \
              <Canvas.Resources> \
                <Storyboard Name="' + name + 'Storyboard" Storyboard.TargetProperty="Opacity" Duration="0:0:0.3"> \
                  <DoubleAnimation Name="' + name + 'BorderAnimation" Storyboard.TargetName="' + name + 'Border"/> \
                  <DoubleAnimation Name="' + name + 'FillAnimation" Storyboard.TargetName="' + name + 'Fill"/> \
                </Storyboard> \
              </Canvas.Resources> \
            </Canvas> \
        ');
        
        button.AddEventListener ("mouseenter", delegate (this, function (o, args) {
            this._Animate ([o.FindName (o.Name + "FillAnimation"), o.FindName (o.Name + "BorderAnimation")], 1);
            o.FindName (o.Name + "Storyboard").Begin ();
        }));
        
        button.AddEventListener ("mouseleave", delegate (this, function (o, args) {
            this._Animate ([o.FindName (o.Name + "FillAnimation"), o.FindName (o.Name + "BorderAnimation")], 0);
            o.FindName (o.Name + "Storyboard").Begin ();
        }));
        
        if (icon_name == null) {
            return button;
        }

        var icon = this.silver.Content.FindName (icon_name);
        if (icon == null) {
            return button;
        }

        icon.GetParent ().Children.Remove (icon);
        button.Children.Add (icon);

        icon["Canvas.Left"] = (button.Width - icon.Width) / 2;
        icon["Canvas.Top"] = (button.Height - icon.Height) / 2;
        icon.Visibility = "Visible";

        return button;
    },
    
    _Animate: function (animations, to_value) {
        for (var i = 0, n = animations.length; i < n; i++) {
            animations[i].To = to_value;
        }
    },
    
    Log: function (x) {
        __MoonEmbeddedLog (x);
    },
    
    ExtendSilver: function () {
        this.silver["MoonMediaPlayer"] = this;
        this.silver["controls"] = new __MoonEmbeddedWmpControls (this);
        
        var properties = [ "src", "source", "filename", "url" ];
        var self = this;
        for (var p in properties) {
            delete this.silver[properties[p]];
            this.silver.__defineSetter__ (properties[p], function (s) { self.LoadSource (s); });
            this.silver.__defineGetter__ (properties[p], function () { return self.xaml.video_element.Source; });
        }
    }
}


