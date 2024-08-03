$(document).on("scroll", function() {
  if ($(document).scrollTop() > 86) {
      $("#navbar").addClass("sticky"); // Make navbar sticky
      $("#nav-logo").addClass("text-white"); // Change logo text color to white
      $(".nav-link").addClass("text-white"); // Change navbar links color to white
      $(".navbar-toggler-icon").addClass("bg-white"); // Change navbar toggler icon color to white
  } else {
      $("#navbar").removeClass("sticky");
      $("#nav-logo").removeClass("text-white");
      $(".nav-link").removeClass("text-white");
      $(".navbar-toggler-icon").removeClass("bg-white");
  }
});

