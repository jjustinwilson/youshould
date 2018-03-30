$( document ).ready(function() {

    $.getJSON( "/user/contacts", function( data ) {

      var data = new Bloodhound({
          datumTokenizer: Bloodhound.tokenizers.whitespace,
          queryTokenizer: Bloodhound.tokenizers.whitespace,
          // `states` is an array of state names defined in "The Basics"
          local: data
        });

        $('#who').typeahead({
          hint: true,
          highlight: true,
          minLength: 1
        },
        {
          name: 'states',
          source: data
        });


    });

    $(".add-note").click(function(e){
      e.preventDefault();

      $(".note-container").toggle();
    })
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
    $(".selectors a").click(function(e){
        $(".selectors a ").each(function(e){
            $(this).removeClass("selected")
        })
        $(this).addClass("selected");
        e.preventDefault();
        var newClass = $(this).data("type");
        $("ul.master_list").each(function(l){
            $(this).removeClass("boxes").removeClass("list").removeClass("standard").addClass(newClass);
        })
    })
    $("#youshould").submit(function(e){
        e.preventDefault();
        console.log( $( this ).serialize() );
        $.ajax({
          type: "POST",
          url: '/item/save',
          data: $( this ).serialize(),
          success: function(data){
              console.log(data)
          }
        });
    })
});
