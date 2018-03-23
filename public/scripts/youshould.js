$( document ).ready(function() {
    console.log( "ready!" );
    // $.getJSON( "/user/contacts", function( data ) {
    //     console.log(data)
    // });
    $(".item .remove").click(function(e){
      var item = $(this)
        e.preventDefault();
        var id = $(this).data("id");
        $.post( "/item/remove",{"id":id}, function( data ) {
            if(data.result == "success"){
              item.closest(".item").css("display","none")
            }else{
                console.log(data);
            }
        });
    });
    $(".item .archive").click(function(e){
      var item = $(this)
        e.preventDefault();
        var id = $(this).data("id");
        console.log(id)
        $.post( "/item/archive",{"id":id}, function( data ) {
            if(data.result == "success"){
              item.closest(".item").appendTo("#archive ul.master_list")
            }else{
                console.log(data);
            }
        });
    });


});
